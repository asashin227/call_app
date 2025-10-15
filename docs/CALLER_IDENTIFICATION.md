# 通話相手の識別方法

このドキュメントでは、WebRTC通話において、受信側がどのように発信者を識別しているかを詳しく説明します。

## 📋 識別情報の構造

### 1. SignalingMessage（シグナリングメッセージ）

通話リクエストは`SignalingMessage`として送信されます：

```typescript
export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accept' | 'call-reject' | 'call-end';
  callId: string;      // 通話を一意に識別するID
  from: string;        // 発信者の識別子（ユーザー名またはID）
  to: string;          // 受信者の識別子（ユーザー名またはID）
  data?: any;          // 追加データ（offer、answer、ICE候補など）
}
```

### 2. IncomingCallRequest（着信通話リクエスト）

受信側では、着信情報を`IncomingCallRequest`として処理します：

```typescript
export interface IncomingCallRequest {
  callId: string;      // 通話ID
  from: User;          // 発信者のユーザー情報
  hasVideo: boolean;   // ビデオ通話かどうか
  timestamp: number;   // 着信時刻
}

export interface User {
  id: string;          // ユーザーID
  name: string;        // 表示名
  status: 'online' | 'offline' | 'busy';  // ステータス
}
```

## 🔄 識別のフロー

### 発信側（Caller）

1. **ユーザー名を入力**
   ```typescript
   // app/(tabs)/index.tsx
   const [description, setDescription] = useState(''); // "田中太郎" など
   ```

2. **シグナリングメッセージを作成**
   ```typescript
   // services/WebRTCService.ts
   this.sendSignalingMessage({
     type: 'call-request',
     callId: callId,
     from: 'local',                    // 発信者（現在は固定値）
     to: targetUser,                   // 入力されたユーザー名
     data: {
       offer: offer,
       hasVideo,
     },
   });
   ```

3. **通話を開始**
   ```typescript
   // services/SignalingService.ts
   const callId = await signalingService.initiateCall(description.trim(), enableVideo);
   ```

### 受信側（Callee）

1. **シグナリングメッセージを受信**
   ```typescript
   // services/SignalingService.ts - simulateIncomingCall()
   const incomingCall: IncomingCallRequest = {
     callId: originalMessage.callId,
     from: {
       id: originalMessage.from,        // 発信者ID
       name: originalMessage.from,      // 発信者名（現在はfromと同じ）
       status: 'online',
     },
     hasVideo: originalMessage.data?.hasVideo || false,
     timestamp: Date.now(),
   };
   ```

2. **着信イベントを発行**
   ```typescript
   // services/SignalingService.ts
   this.emit('incoming_call', incomingCall);
   ```

3. **UIで発信者情報を表示**
   ```typescript
   // components/WebRTCCallModal.tsx
   const handleIncomingCall = (call: IncomingCallRequest) => {
     console.log('📞 Incoming call from:', call.from.name);
     setIncomingCall(call);
     setCallState('incoming');
   };
   ```

4. **着信画面で発信者を表示**
   ```tsx
   {/* components/WebRTCCallModal.tsx - 着信画面 */}
   <View style={styles.callerAvatar}>
     <Text style={styles.callerAvatarText}>
       {incomingCall.from.name.charAt(0).toUpperCase()}
     </Text>
   </View>
   <Text style={styles.callerName}>{incomingCall.from.name}</Text>
   <Text style={styles.incomingCallLabel}>
     {incomingCall.hasVideo ? 'ビデオ通話' : '音声通話'}の着信
   </Text>
   ```

## 🎯 現在の実装の特徴

### デモ環境での識別

現在の実装は**デモ環境用**で、以下の特徴があります：

1. **入力されたユーザー名が識別子になる**
   - 発信側が入力した名前（例："田中太郎"）がそのまま`from`フィールドに設定される
   - 受信側ではこの名前が表示される

2. **固定のユーザーリスト**
   ```typescript
   private demoUsers: User[] = [
     { id: 'user1', name: '田中太郎', status: 'online' },
     { id: 'user2', name: '佐藤花子', status: 'online' },
     { id: 'user3', name: 'Mike Johnson', status: 'online' },
     { id: 'user4', name: 'Sarah Wilson', status: 'offline' },
   ];
   ```

3. **名前マッチング**
   ```typescript
   const targetUser = this.connectedUsers.get(originalMessage.to) || 
                     this.demoUsers.find(u => u.name === originalMessage.to);
   ```
   - 入力された名前がデモユーザーリストと一致する場合、そのユーザー情報を使用
   - 一致しない場合は、入力された名前をそのまま使用

## 🚀 本番環境での改善案

実際のアプリケーションでは、以下の改善が必要です：

### 1. 認証システムの統合

```typescript
// ユーザー登録・ログイン
interface AuthenticatedUser {
  id: string;              // UUIDなどの一意なID
  username: string;        // ユーザー名
  displayName: string;     // 表示名
  email: string;          // メールアドレス
  avatar?: string;        // プロフィール画像URL
  phoneNumber?: string;   // 電話番号
}

// ログイン時に取得
const currentUser = await authService.login(email, password);
signalingService.connect(currentUser);
```

### 2. シグナリングサーバーとの連携

```typescript
// WebSocketなどでシグナリングサーバーに接続
class SignalingService {
  private websocket: WebSocket;
  
  async connect(user: User) {
    this.websocket = new WebSocket('wss://your-signaling-server.com');
    
    this.websocket.onmessage = (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      this.handleIncomingMessage(message);
    };
    
    // ユーザー認証
    this.websocket.send(JSON.stringify({
      type: 'authenticate',
      token: user.authToken,
    }));
  }
  
  private handleIncomingMessage(message: SignalingMessage) {
    switch (message.type) {
      case 'call-request':
        // サーバーから発信者の完全な情報を受信
        const incomingCall: IncomingCallRequest = {
          callId: message.callId,
          from: message.data.caller,  // サーバーから提供される発信者情報
          hasVideo: message.data.hasVideo,
          timestamp: Date.now(),
        };
        this.emit('incoming_call', incomingCall);
        break;
    }
  }
}
```

### 3. ユーザー検索機能

```typescript
// ユーザーを検索して通話相手を選択
interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
}

// ユーザー検索API
async searchUsers(query: string): Promise<UserSearchResult[]> {
  const response = await fetch(`/api/users/search?q=${query}`);
  return response.json();
}

// 通話開始時に選択されたユーザーのIDを使用
async initiateCall(targetUserId: string, hasVideo: boolean) {
  const message: SignalingMessage = {
    type: 'call-request',
    callId: generateCallId(),
    from: this.currentUser.id,      // 認証されたユーザーID
    to: targetUserId,                // 選択されたユーザーID
    data: {
      offer,
      hasVideo,
      callerInfo: {                  // 発信者情報を含める
        id: this.currentUser.id,
        displayName: this.currentUser.displayName,
        avatar: this.currentUser.avatar,
      },
    },
  };
  
  await this.sendMessage(message);
}
```

### 4. 連絡先統合

```typescript
// 端末の連絡先と統合
import Contacts from 'react-native-contacts';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  appUserId?: string;  // アプリに登録済みの場合のユーザーID
  isRegistered: boolean;
}

// 連絡先から通話
async callContact(contact: Contact) {
  if (contact.isRegistered && contact.appUserId) {
    // アプリユーザーとして通話
    await signalingService.initiateCall(contact.appUserId, false);
  } else {
    // 電話番号で招待
    await inviteToApp(contact.phoneNumber);
  }
}
```

### 5. プッシュ通知との連携

```typescript
// 着信時のプッシュ通知
interface CallNotification {
  type: 'incoming_call';
  callId: string;
  from: {
    id: string;
    name: string;
    avatar?: string;
  };
  hasVideo: boolean;
}

// アプリがバックグラウンドの時に通知を表示
async function handlePushNotification(notification: CallNotification) {
  // OSネイティブの着信画面を表示
  await RNCallKeep.displayIncomingCall(
    notification.callId,
    notification.from.name,
    notification.from.name,
    'generic',
    notification.hasVideo
  );
}
```

## 📊 識別情報のセキュリティ

### 現在の課題

1. **なりすましが可能**
   - 任意の名前を入力できるため、他人になりすませる

2. **認証なし**
   - ユーザーの実在確認がない

3. **暗号化なし**
   - シグナリングメッセージが平文で送信される（デモ環境）

### 本番環境での対策

1. **エンドツーエンド暗号化**
   ```typescript
   // DTLS-SRTCによるメディアストリームの暗号化（WebRTCが自動で実行）
   const peerConnection = new RTCPeerConnection({
     iceServers: [...],
     // 暗号化設定
   });
   ```

2. **シグナリングサーバーでの認証**
   ```typescript
   // JWT トークンによる認証
   const token = await authService.getAuthToken();
   websocket.send(JSON.stringify({
     type: 'authenticate',
     token: token,
   }));
   ```

3. **通話の暗号化された検証**
   ```typescript
   // SASを使用した通話相手の検証
   interface SecurityCode {
     code: string;  // 例: "🔒 1234"
     verified: boolean;
   }
   
   // 両者が同じコードを確認
   const securityCode = generateSASCode(offer, answer);
   ```

## 🔍 デバッグ方法

現在の実装で識別情報を確認する方法：

```typescript
// コンソールログを確認
console.log('📞 Incoming call from:', call.from.name);
console.log('- User ID:', call.from.id);
console.log('- Status:', call.from.status);
console.log('- Has video:', call.hasVideo);
console.log('- Call ID:', call.callId);
```

## まとめ

**現在の実装（デモ環境）：**
- ✅ シンプルで理解しやすい
- ✅ テスト・開発に適している
- ❌ セキュリティなし
- ❌ 認証なし
- ❌ なりすまし防止なし

**本番環境に必要な要素：**
- ✅ ユーザー認証システム
- ✅ シグナリングサーバー
- ✅ データベースでのユーザー管理
- ✅ プッシュ通知
- ✅ エンドツーエンド暗号化
- ✅ 通話履歴の記録
- ✅ ブロック機能

