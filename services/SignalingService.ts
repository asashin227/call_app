import { SignalingMessage, webRTCService } from './WebRTCService';

// シンプルなイベントエミッター
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }
}

// ユーザー情報
export interface User {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
}

// 通話リクエスト情報
export interface IncomingCallRequest {
  callId: string;
  from: User;
  hasVideo: boolean;
  timestamp: number;
}

class SignalingService extends EventEmitter {
  private currentUser: User | null = null;
  private connectedUsers: Map<string, User> = new Map();
  private isConnected: boolean = false;

  // デモ用のユーザーリスト
  private demoUsers: User[] = [
    { id: 'user1', name: '田中太郎', status: 'online' },
    { id: 'user2', name: '佐藤花子', status: 'online' },
    { id: 'user3', name: 'Mike Johnson', status: 'online' },
    { id: 'user4', name: 'Sarah Wilson', status: 'offline' },
  ];

  constructor() {
    super();
    console.log('📡 SignalingService: Initializing...');
    this.initializeDemoEnvironment();
  }

  // デモ環境を初期化
  private initializeDemoEnvironment() {
    // デモ用ユーザーをconnectedUsersに追加
    this.demoUsers.forEach(user => {
      if (user.status === 'online') {
        this.connectedUsers.set(user.id, user);
      }
    });

    // 現在のユーザーを設定（デモ用）
    this.currentUser = { id: 'local_user', name: 'あなた', status: 'online' };
    this.isConnected = true;

    console.log('✅ SignalingService: Demo environment initialized');
    console.log('- Current user:', this.currentUser.name);
    console.log('- Connected users:', Array.from(this.connectedUsers.values()).map(u => u.name));
  }

  // ユーザーを接続
  async connect(user: User): Promise<void> {
    try {
      console.log('🔗 SignalingService: Connecting user:', user.name);

      this.currentUser = user;
      this.isConnected = true;

      // 接続成功イベントを発行
      this.emit('connected', user);

      // 既存ユーザーリストを通知
      this.emit('users_updated', Array.from(this.connectedUsers.values()));

      console.log('✅ SignalingService: User connected successfully');

    } catch (error) {
      console.error('❌ SignalingService: Failed to connect:', error);
      throw error;
    }
  }

  // 接続を切断
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 SignalingService: Disconnecting...');

      this.isConnected = false;
      this.currentUser = null;
      this.connectedUsers.clear();

      this.emit('disconnected');

      console.log('✅ SignalingService: Disconnected successfully');

    } catch (error) {
      console.error('❌ SignalingService: Failed to disconnect:', error);
    }
  }

  // シグナリングメッセージを送信
  async sendMessage(message: SignalingMessage): Promise<void> {
    try {
      console.log('📤 SignalingService: Sending message:', message.type, 'to', message.to);

      if (!this.isConnected) {
        throw new Error('Not connected to signaling server');
      }

      // デモ実装: 実際のサーバー送信の代わりにローカル配信
      setTimeout(() => {
        this.simulateMessageDelivery(message);
      }, 100); // 少し遅延を追加してリアルな感じに

      console.log('✅ SignalingService: Message sent');

    } catch (error) {
      console.error('❌ SignalingService: Failed to send message:', error);
      throw error;
    }
  }

  // メッセージ配信をシミュレート（デモ用）
  private simulateMessageDelivery(message: SignalingMessage) {
    console.log('📥 SignalingService: Simulating message delivery:', message.type);

    // 自動応答をシミュレート
    switch (message.type) {
      case 'call-request':
        // 着信通話をシミュレート
        setTimeout(() => {
          this.simulateIncomingCall(message);
        }, 1000);
        break;

      case 'call-accept':
        // 通話受諾をWebRTCサービスに通知
        webRTCService.handleSignalingMessage({
          type: 'answer',
          callId: message.callId,
          from: message.to,
          to: message.from,
          data: message.data.answer,
        });
        break;

      case 'call-end':
        // 通話終了をシミュレート
        this.emit('call_ended', message.callId);
        break;
    }
  }

  // 着信通話をシミュレート（デモ用）
  private simulateIncomingCall(originalMessage: SignalingMessage) {
    console.log('📞 SignalingService: Simulating incoming call...');

    const targetUser = this.connectedUsers.get(originalMessage.to) || 
                      this.demoUsers.find(u => u.name === originalMessage.to);

    if (!targetUser) {
      console.log('❌ SignalingService: Target user not found for incoming call simulation');
      return;
    }

    // 着信通話リクエストを生成
    const incomingCall: IncomingCallRequest = {
      callId: originalMessage.callId,
      from: {
        id: originalMessage.from,
        name: originalMessage.from,
        status: 'online',
      },
      hasVideo: originalMessage.data?.hasVideo || false,
      timestamp: Date.now(),
    };

    // 着信イベントを発行
    this.emit('incoming_call', incomingCall);

    // 自動で通話を受諾するか、ユーザーの判断を待つ
    // デモでは3秒後に自動受諾
    setTimeout(() => {
      console.log('🤖 SignalingService: Auto-accepting call for demo...');
      this.acceptCall(incomingCall.callId, originalMessage.data.offer);
    }, 3000);
  }

  // 通話を受諾
  async acceptCall(callId: string, offer: any): Promise<void> {
    try {
      console.log('✅ SignalingService: Accepting call:', callId);

      // WebRTCサービスで通話を受諾
      const callData = {
        id: callId,
        targetUser: 'remote_user',
        type: 'incoming' as const,
        hasVideo: offer?.hasVideo || false,
        status: 'connected' as const,
      };

      await webRTCService.acceptCall(callData, offer);

      this.emit('call_accepted', callId);

    } catch (error) {
      console.error('❌ SignalingService: Failed to accept call:', error);
      throw error;
    }
  }

  // 通話を拒否
  async rejectCall(callId: string): Promise<void> {
    try {
      console.log('❌ SignalingService: Rejecting call:', callId);

      const message: SignalingMessage = {
        type: 'call-reject',
        callId,
        from: this.currentUser?.id || 'local_user',
        to: 'remote_user', // 実際の実装では適切な値を設定
      };

      await this.sendMessage(message);
      this.emit('call_rejected', callId);

    } catch (error) {
      console.error('❌ SignalingService: Failed to reject call:', error);
      throw error;
    }
  }

  // 利用可能なユーザー一覧を取得
  getAvailableUsers(): User[] {
    return Array.from(this.connectedUsers.values()).filter(
      user => user.id !== this.currentUser?.id && user.status === 'online'
    );
  }

  // 現在のユーザー情報を取得
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // 接続状態を取得
  isConnectedToSignaling(): boolean {
    return this.isConnected;
  }

  // ユーザーを検索（名前で部分一致）
  searchUsers(query: string): User[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    return Array.from(this.connectedUsers.values()).filter(user => 
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.id.toLowerCase().includes(normalizedQuery)
    );
  }

  // 特定のユーザーに通話を開始
  async initiateCall(targetUser: string, hasVideo: boolean = false): Promise<string> {
    try {
      console.log('📞 SignalingService: Initiating call to:', targetUser, 'with video:', hasVideo);

      if (!this.isConnected || !this.currentUser) {
        throw new Error('Not connected to signaling service');
      }

      // WebRTCサービスで通話を開始
      const callData = await webRTCService.startCall(targetUser, hasVideo);

      console.log('✅ SignalingService: Call initiated with ID:', callData.id);
      return callData.id;

    } catch (error) {
      console.error('❌ SignalingService: Failed to initiate call:', error);
      throw error;
    }
  }

  // 通話を終了
  async endCall(callId: string): Promise<void> {
    try {
      console.log('🔚 SignalingService: Ending call:', callId);

      const message: SignalingMessage = {
        type: 'call-end',
        callId,
        from: this.currentUser?.id || 'local_user',
        to: 'remote_user', // 実際の実装では適切な値を設定
      };

      await this.sendMessage(message);
      await webRTCService.endCall();

      this.emit('call_ended', callId);

    } catch (error) {
      console.error('❌ SignalingService: Failed to end call:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const signalingService = new SignalingService();
export default signalingService;
