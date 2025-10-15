import {
    MediaStream,
    RTCConfiguration,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
    getUserMedia
} from 'react-native-webrtc';

export interface CallData {
  id: string;
  targetUser: string;
  type: 'outgoing' | 'incoming';
  hasVideo: boolean;
  status: 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed';
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accept' | 'call-reject' | 'call-end';
  callId: string;
  from: string;
  to: string;
  data?: any;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCall: CallData | null = null;
  private isInitiator: boolean = false;

  // WebRTC設定
  private configuration: RTCConfiguration = {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // イベントリスナー
  private onLocalStreamCallback?: (stream: MediaStream) => void;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onCallStatusChangeCallback?: (status: CallData['status']) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor() {
    console.log('🎥 WebRTCService: Initializing...');
  }

  // イベントリスナーを設定
  setEventListeners(callbacks: {
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onCallStatusChange?: (status: CallData['status']) => void;
    onError?: (error: Error) => void;
  }) {
    this.onLocalStreamCallback = callbacks.onLocalStream;
    this.onRemoteStreamCallback = callbacks.onRemoteStream;
    this.onCallStatusChangeCallback = callbacks.onCallStatusChange;
    this.onErrorCallback = callbacks.onError;
  }

  // ローカルストリームを取得
  async getLocalStream(video: boolean = false): Promise<MediaStream> {
    try {
      console.log('🎥 WebRTCService: Getting local stream, video:', video);

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 24, max: 30 },
          facingMode: 'user',
        } : false,
      };

      const stream = await getUserMedia(constraints);
      this.localStream = stream;

      console.log('✅ WebRTCService: Local stream obtained');
      console.log('- Audio tracks:', stream.getAudioTracks().length);
      console.log('- Video tracks:', stream.getVideoTracks().length);

      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(stream);
      }

      return stream;
    } catch (error) {
      console.error('❌ WebRTCService: Failed to get local stream:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  // ピア接続を初期化
  private async initializePeerConnection(): Promise<RTCPeerConnection> {
    try {
      console.log('🔗 WebRTCService: Initializing peer connection...');

      const pc = new RTCPeerConnection(this.configuration);

      // ICE候補イベント
      pc.onicecandidate = (event) => {
        if (event.candidate && this.currentCall) {
          console.log('🧊 WebRTCService: ICE candidate generated');
          // シグナリングサーバーに送信（後で実装）
          this.sendSignalingMessage({
            type: 'ice-candidate',
            callId: this.currentCall.id,
            from: 'local', // 実際のユーザーIDに置き換え
            to: this.currentCall.targetUser,
            data: event.candidate,
          });
        }
      };

      // リモートストリームイベント
      pc.onaddstream = (event) => {
        console.log('📡 WebRTCService: Remote stream received');
        this.remoteStream = event.stream;
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(event.stream);
        }
      };

      // 接続状態変更イベント
      pc.onconnectionstatechange = () => {
        console.log('🔗 WebRTCService: Connection state:', pc.connectionState);
        
        switch (pc.connectionState) {
          case 'connected':
            this.updateCallStatus('connected');
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            this.updateCallStatus('ended');
            break;
        }
      };

      // ICE接続状態変更イベント
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 WebRTCService: ICE connection state:', pc.iceConnectionState);
      };

      this.peerConnection = pc;
      return pc;
    } catch (error) {
      console.error('❌ WebRTCService: Failed to initialize peer connection:', error);
      throw error;
    }
  }

  // 発信を開始
  async startCall(targetUser: string, hasVideo: boolean = false): Promise<CallData> {
    try {
      console.log('📞 WebRTCService: Starting call to', targetUser, 'with video:', hasVideo);

      const callId = this.generateCallId();
      this.currentCall = {
        id: callId,
        targetUser,
        type: 'outgoing',
        hasVideo,
        status: 'initiating',
      };

      this.isInitiator = true;

      // ローカルストリームを取得
      await this.getLocalStream(hasVideo);

      // ピア接続を初期化
      const pc = await this.initializePeerConnection();

      // ローカルストリームを追加
      if (this.localStream) {
        pc.addStream(this.localStream);
      }

      // オファーを作成
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: hasVideo,
      });

      await pc.setLocalDescription(offer);

      // シグナリングメッセージを送信
      this.sendSignalingMessage({
        type: 'call-request',
        callId,
        from: 'local', // 実際のユーザーIDに置き換え
        to: targetUser,
        data: {
          offer: offer,
          hasVideo,
        },
      });

      this.updateCallStatus('ringing');

      console.log('✅ WebRTCService: Call initiated successfully');
      return this.currentCall;

    } catch (error) {
      console.error('❌ WebRTCService: Failed to start call:', error);
      this.updateCallStatus('failed');
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  // 着信を受け入れ
  async acceptCall(callData: CallData, offer: RTCSessionDescription): Promise<void> {
    try {
      console.log('📞 WebRTCService: Accepting call from', callData.targetUser);

      this.currentCall = { ...callData, type: 'incoming' };
      this.isInitiator = false;

      // ローカルストリームを取得
      await this.getLocalStream(callData.hasVideo);

      // ピア接続を初期化
      const pc = await this.initializePeerConnection();

      // ローカルストリームを追加
      if (this.localStream) {
        pc.addStream(this.localStream);
      }

      // リモートオファーを設定
      await pc.setRemoteDescription(offer);

      // アンサーを作成
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // シグナリングメッセージを送信
      this.sendSignalingMessage({
        type: 'call-accept',
        callId: callData.id,
        from: 'local', // 実際のユーザーIDに置き換え
        to: callData.targetUser,
        data: { answer },
      });

      this.updateCallStatus('connected');

      console.log('✅ WebRTCService: Call accepted successfully');

    } catch (error) {
      console.error('❌ WebRTCService: Failed to accept call:', error);
      this.updateCallStatus('failed');
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  // 通話を終了
  async endCall(): Promise<void> {
    try {
      console.log('🔚 WebRTCService: Ending call...');

      if (this.currentCall) {
        // シグナリングメッセージを送信
        this.sendSignalingMessage({
          type: 'call-end',
          callId: this.currentCall.id,
          from: 'local', // 実際のユーザーIDに置き換え
          to: this.currentCall.targetUser,
        });
      }

      this.cleanup();
      console.log('✅ WebRTCService: Call ended successfully');

    } catch (error) {
      console.error('❌ WebRTCService: Failed to end call:', error);
      this.cleanup();
    }
  }

  // シグナリングメッセージを処理
  async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    try {
      console.log('📨 WebRTCService: Handling signaling message:', message.type);

      if (!this.peerConnection) {
        console.warn('⚠️ WebRTCService: No peer connection available for signaling message');
        return;
      }

      switch (message.type) {
        case 'offer':
          await this.peerConnection.setRemoteDescription(message.data);
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          
          this.sendSignalingMessage({
            type: 'answer',
            callId: message.callId,
            from: 'local',
            to: message.from,
            data: answer,
          });
          break;

        case 'answer':
          await this.peerConnection.setRemoteDescription(message.data);
          this.updateCallStatus('connected');
          break;

        case 'ice-candidate':
          const candidate = new RTCIceCandidate(message.data);
          await this.peerConnection.addIceCandidate(candidate);
          break;

        case 'call-end':
          this.updateCallStatus('ended');
          this.cleanup();
          break;
      }

    } catch (error) {
      console.error('❌ WebRTCService: Failed to handle signaling message:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
    }
  }

  // 音声のミュート/ミュート解除
  toggleAudio(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('🔊 WebRTCService: Audio toggled:', audioTrack.enabled ? 'unmuted' : 'muted');
      return audioTrack.enabled;
    }
    return false;
  }

  // ビデオのオン/オフ
  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('📹 WebRTCService: Video toggled:', videoTrack.enabled ? 'on' : 'off');
      return videoTrack.enabled;
    }
    return false;
  }

  // カメラを切り替え（前面/背面）
  async switchCamera(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      // @ts-ignore - React Native WebRTCの拡張メソッド
      await videoTrack._switchCamera();
      console.log('📷 WebRTCService: Camera switched');
    }
  }

  // 現在の通話情報を取得
  getCurrentCall(): CallData | null {
    return this.currentCall;
  }

  // ローカルストリームを取得
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // リモートストリームを取得
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // プライベートメソッド

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateCallStatus(status: CallData['status']): void {
    if (this.currentCall) {
      this.currentCall.status = status;
      console.log('📱 WebRTCService: Call status updated to:', status);
      
      if (this.onCallStatusChangeCallback) {
        this.onCallStatusChangeCallback(status);
      }
    }
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    // TODO: 実際のシグナリングサーバーに送信
    // 今は仮実装でログ出力のみ
    console.log('📡 WebRTCService: Sending signaling message:', message.type, message);
  }

  private cleanup(): void {
    console.log('🧹 WebRTCService: Cleaning up resources...');

    // ストリームを停止
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      this.remoteStream = null;
    }

    // ピア接続を閉じる
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // 通話状態をリセット
    if (this.currentCall) {
      this.currentCall.status = 'ended';
    }
    this.currentCall = null;
    this.isInitiator = false;

    console.log('✅ WebRTCService: Cleanup completed');
  }
}

// シングルトンインスタンス
export const webRTCService = new WebRTCService();
export default webRTCService;
