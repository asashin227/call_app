import { audioRouteService } from '@/services/AudioRouteService';
import { CallData, webRTCService } from '@/services/WebRTCService';
import { generateUUID } from '@/utils/uuid';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import InCallManager from 'react-native-incall-manager';
import { RTCView } from 'react-native-webrtc';

const { width, height } = Dimensions.get('window');

interface CallScreenProps {
  callData: CallData;
  onEndCall: () => void;
}

export default function CallScreen({ callData, onEndCall }: CallScreenProps) {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<CallData['status']>(callData.status);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callData.hasVideo);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callKeepUUID, setCallKeepUUID] = useState<string | null>(null);

  // CallKeep統合とInCallManager初期化
  useEffect(() => {
    const setupCallKeep = async () => {
      try {
        // InCallManagerを起動（WebRTC通話用）
        console.log('📞 CallScreen: Starting InCallManager for WebRTC');
        InCallManager.start({ media: 'audio', auto: false, ringback: '' });
        
        // デフォルトでイヤピースに設定（スピーカーオフ）
        InCallManager.setForceSpeakerphoneOn(isSpeakerEnabled);
        
        // WebRTCServiceからCallKeep UUIDを取得
        const uuid = webRTCService.getCallKeepUUID();
        
        if (uuid) {
          console.log('📞 CallScreen: Using existing CallKeep UUID:', uuid);
          setCallKeepUUID(uuid);
          
          // CallKeepの通話をアクティブに設定
          RNCallKeep.setCurrentCallActive(uuid);
        } else {
          // UUIDがない場合は新しく生成（フォールバック）
          const newUuid = generateUUID();
          console.log('📞 CallScreen: Creating new CallKeep UUID:', newUuid);
          setCallKeepUUID(newUuid);
          webRTCService.setCallKeepUUID(newUuid);
          
          // CallKeepで通話を開始
          RNCallKeep.startCall(newUuid, callData.targetUser, callData.targetUser, 'generic', callData.hasVideo);
          RNCallKeep.setCurrentCallActive(newUuid);
        }
      } catch (error) {
        console.error('❌ CallScreen: Failed to setup CallKeep:', error);
      }
    };

    setupCallKeep();

    // クリーンアップ: 通話画面を閉じる際にCallKeepとInCallManagerを終了
    return () => {
      if (callKeepUUID) {
        console.log('📞 CallScreen: Ending CallKeep call:', callKeepUUID);
        try {
          RNCallKeep.endCall(callKeepUUID);
        } catch (error) {
          console.error('❌ CallScreen: Failed to end CallKeep call:', error);
        }
      }
      
      // InCallManagerを停止
      console.log('📞 CallScreen: Stopping InCallManager');
      try {
        InCallManager.stop();
      } catch (error) {
        console.error('❌ CallScreen: Failed to stop InCallManager:', error);
      }
    };
  }, []);

  // AudioRouteServiceのリスナーを設定（CallKitからの音声経路変更を検知）
  useEffect(() => {
    console.log('🎧 CallScreen: Setting up AudioRouteService listener');
    
    const unsubscribe = audioRouteService.addListener((event) => {
      console.log(`🎧 CallScreen: Received audio route change event:`, event);
      console.log(`- Route: ${event.route}, Reason: ${event.reason}, Source: ${event.source}`);
      
      // スピーカー状態を更新
      const newSpeakerState = event.route === 'Speaker';
      
      // UI状態を常に更新
      console.log(`🎧 CallScreen: Updating speaker state: ${newSpeakerState ? 'ON (Speaker)' : 'OFF (Earpiece)'}`);
      setIsSpeakerEnabled(newSpeakerState);
      
      // CallKitからの変更の場合のみInCallManagerに反映
      // （app-uiからの変更の場合は、toggleSpeaker()で既に設定済み）
      if (event.source === 'callkit') {
        try {
          InCallManager.setForceSpeakerphoneOn(newSpeakerState);
          console.log(`🎧 CallScreen: InCallManager synced to match CallKit state`);
        } catch (error) {
          console.error('❌ CallScreen: Failed to sync InCallManager:', error);
        }
      } else {
        console.log(`🎧 CallScreen: Skipping InCallManager update (already set by app UI)`);
      }
    });
    
    return () => {
      console.log('🎧 CallScreen: Removing AudioRouteService listener');
      unsubscribe();
    };
  }, []); // 依存配列を空にして、リスナーを一度だけ作成

  // 通話時間のカウンター
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (callStatus === 'connected' && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callStatus, callStartTime]);

  // WebRTCサービスのイベントリスナーを設定
  useEffect(() => {
    const setupEventListeners = () => {
      webRTCService.setEventListeners({
        onLocalStream: (stream) => {
          console.log('📱 CallScreen: Local stream received');
          setLocalStream(stream);
        },
        onRemoteStream: (stream) => {
          console.log('📱 CallScreen: Remote stream received');
          setRemoteStream(stream);
        },
        onCallStatusChange: (status) => {
          console.log('📱 CallScreen: Call status changed to:', status);
          setCallStatus(status);
          
          if (status === 'connected' && !callStartTime) {
            setCallStartTime(Date.now());
          } else if (status === 'ended' || status === 'failed') {
            onEndCall();
          }
        },
        onError: (error) => {
          console.error('📱 CallScreen: WebRTC error:', error);
          Alert.alert('通話エラー', error.message, [
            { text: 'OK', onPress: onEndCall }
          ]);
        },
      });
    };

    setupEventListeners();

    // 既存のストリームを取得
    const existingLocalStream = webRTCService.getCurrentLocalStream();
    const existingRemoteStream = webRTCService.getRemoteStream();

    if (existingLocalStream) {
      setLocalStream(existingLocalStream);
    }

    if (existingRemoteStream) {
      setRemoteStream(existingRemoteStream);
    }

    return () => {
      // クリーンアップ（必要に応じて）
    };
  }, [callStartTime, onEndCall]);

  // 通話時間をフォーマット
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 音声ミュート切り替え
  const toggleAudio = useCallback(() => {
    const newMutedState = webRTCService.toggleAudio();
    setIsAudioMuted(!newMutedState);
    
    // CallKeepにもミュート状態を反映
    if (callKeepUUID) {
      try {
        RNCallKeep.setMutedCall(callKeepUUID, !newMutedState);
      } catch (error) {
        console.error('❌ CallScreen: Failed to set mute state in CallKeep:', error);
      }
    }
  }, [callKeepUUID]);

  // ビデオオン/オフ切り替え
  const toggleVideo = useCallback(() => {
    const newVideoState = webRTCService.toggleVideo();
    setIsVideoEnabled(newVideoState);
  }, []);

  // カメラ切り替え（前面/背面）
  const switchCamera = useCallback(async () => {
    try {
      await webRTCService.switchCamera();
    } catch (error) {
      console.error('📱 CallScreen: Failed to switch camera:', error);
    }
  }, []);

  // スピーカー切り替え（イヤピース/スピーカー）
  const toggleSpeaker = useCallback(() => {
    const newSpeakerState = !isSpeakerEnabled;
    
    console.log(`🔊 CallScreen: App UI toggling speaker: ${isSpeakerEnabled} → ${newSpeakerState}`);
    
    // UI状態を更新
    setIsSpeakerEnabled(newSpeakerState);
    
    try {
      // InCallManagerを使用してスピーカーを切り替え
      InCallManager.setForceSpeakerphoneOn(newSpeakerState);
      console.log('🔊 CallScreen: InCallManager updated:', newSpeakerState ? 'ON (Speaker)' : 'OFF (Earpiece)');
      
      // AudioRouteServiceに通知（アプリUI側からの変更）
      audioRouteService.handleAppUIRouteChange(newSpeakerState);
    } catch (error) {
      console.error('❌ CallScreen: Failed to toggle speaker:', error);
    }
  }, [isSpeakerEnabled]);

  // 通話終了
  const handleEndCall = useCallback(async () => {
    try {
      // CallKeepの通話を終了
      if (callKeepUUID) {
        console.log('📞 CallScreen: Ending CallKeep call from button:', callKeepUUID);
        try {
          RNCallKeep.endCall(callKeepUUID);
        } catch (error) {
          console.error('❌ CallScreen: Failed to end CallKeep call:', error);
        }
      }
      
      // WebRTCの通話を終了
      await webRTCService.endCall();
      
      onEndCall();
    } catch (error) {
      console.error('📱 CallScreen: Failed to end call:', error);
      onEndCall(); // エラーでも画面を閉じる
    }
  }, [callKeepUUID, onEndCall]);

  // 通話状態に応じたメッセージ
  const getStatusMessage = () => {
    switch (callStatus) {
      case 'initiating':
        return '発信中...';
      case 'ringing':
        return '呼び出し中...';
      case 'connected':
        return formatCallDuration(callDuration);
      case 'ended':
        return '通話終了';
      case 'failed':
        return '接続失敗';
      default:
        return '通話中';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* ヘッダー部分 */}
      <View style={styles.header}>
        <Text style={styles.contactName}>{callData.targetUser}</Text>
        <Text style={styles.callStatus}>{getStatusMessage()}</Text>
      </View>

      {/* ビデオ表示エリア */}
      <View style={styles.videoContainer}>
        {/* リモートビデオ（メイン） */}
        {remoteStream && callData.hasVideo && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            zOrder={0}
          />
        )}

        {/* リモートビデオがない場合のプレースホルダー */}
        {(!remoteStream || !callData.hasVideo) && (
          <View style={styles.videoPlaceholder}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {callData.targetUser.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.placeholderText}>
              {callData.hasVideo ? 'ビデオを待機中...' : '音声通話'}
            </Text>
          </View>
        )}

        {/* ローカルビデオ（小さなプレビュー） */}
        {localStream && callData.hasVideo && isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              zOrder={1}
            />
          </View>
        )}
      </View>

      {/* コントロールボタン */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* 音声ミュート */}
          <TouchableOpacity
            style={[styles.controlButton, isAudioMuted && styles.controlButtonActive]}
            onPress={toggleAudio}
          >
            <Ionicons
              name={isAudioMuted ? 'mic-off' : 'mic'}
              size={24}
              color={isAudioMuted ? '#fff' : '#333'}
            />
          </TouchableOpacity>

          {/* ビデオオン/オフ */}
          {callData.hasVideo && (
            <TouchableOpacity
              style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Ionicons
                name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color={isVideoEnabled ? '#333' : '#fff'}
              />
            </TouchableOpacity>
          )}

          {/* スピーカー */}
          <TouchableOpacity
            style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerEnabled ? 'volume-high' : 'volume-low'}
              size={24}
              color={isSpeakerEnabled ? '#fff' : '#333'}
            />
          </TouchableOpacity>

          {/* カメラ切り替え */}
          {callData.hasVideo && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </View>

        {/* 通話終了ボタン */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 2,
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    color: '#ccc',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholderText: {
    fontSize: 18,
    color: '#ccc',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonActive: {
    backgroundColor: '#FF3B30',
  },
  endCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
