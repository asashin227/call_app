# シグナリングサーバーとは？

## 📞 簡単な例え話

### 電話をかける時のプロセス

```
あなた（Aさん）が友人（Bさん）に電話をかけたい
↓
【電話交換機】が必要
↓
電話交換機が「AさんからBさんへ電話したい」という情報を中継
↓
Bさんに着信が届く
↓
Bさんが受話器を取る
↓
【直接通話開始】（電話交換機は不要になる）
```

**シグナリングサーバー = この「電話交換機」の役割**

---

## 🌐 WebRTCにおけるシグナリングサーバー

### WebRTCの特徴

WebRTCは**P2P（ピアツーピア）通信**です：

```
通話中のデータの流れ:

  デバイスA ←━━━━━━━━━━━━━→ デバイスB
              直接接続
           (音声・映像)
```

しかし、**最初の接続を確立するまで**は、お互いの情報を交換する必要があります。

---

## 🔧 シグナリングサーバーの役割

### 1. 通話開始の仲介

```
Step 1: Aさんが「Bさんと話したい」
┌─────────┐
│ デバイスA │──「Bさんと通話したい」─→ シグナリングサーバー
└─────────┘

Step 2: サーバーがBさんに通知
                              シグナリングサーバー
                                      ↓
                            「Aさんから着信です」
                                      ↓
                              ┌─────────┐
                              │ デバイスB │
                              └─────────┘

Step 3: Bさんが応答
                              ┌─────────┐
                              │ デバイスB │──「OK、受けます」─→
                              └─────────┘
                                                    ↓
                              シグナリングサーバー
                                      ↓
                            「Bさんが応答しました」
                                      ↓
┌─────────┐
│ デバイスA │
└─────────┘

Step 4: 直接接続が確立したら、サーバーは不要
┌─────────┐                    ┌─────────┐
│ デバイスA │ ←═══════════════→ │ デバイスB │
└─────────┘    直接P2P通話      └─────────┘

        シグナリングサーバー
              (もう使わない)
```

---

## 📋 シグナリングサーバーが交換する情報

### 1. Session Description Protocol (SDP)

**Offer（発信側からの提案）:**
```
「私はこんな通信ができます」という情報:
- 対応している音声コーデック（Opus, AAC, etc.）
- 対応している映像コーデック（VP8, H.264, etc.）
- 使用するポート番号
- 暗号化の設定
```

**Answer（受信側からの応答）:**
```
「わかりました。私はこれで接続します」という情報:
- 選択したコーデック
- 接続に使用する設定
```

### 2. ICE候補（接続経路の情報）

```
「私にはこんな経路で接続できます」という情報:
- ローカルIPアドレス: 192.168.1.10:50000
- グローバルIPアドレス: 203.0.113.45:60000
- リレーサーバー経由: relay.example.com:3478
```

---

## 💬 実際のメッセージの流れ

### シナリオ: 田中さん → 佐藤さんに電話

```javascript
// 1. 田中さんが発信
デバイスA → シグナリングサーバー:
{
  type: "call-request",
  from: "田中太郎",
  to: "佐藤花子",
  callId: "call_12345",
  data: {
    offer: {
      type: "offer",
      sdp: "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n..."
    }
  }
}

// 2. サーバーが佐藤さんに転送
シグナリングサーバー → デバイスB:
{
  type: "call-request",
  from: "田中太郎",
  to: "佐藤花子",
  callId: "call_12345",
  data: {
    offer: { ... }
  }
}

// 3. 佐藤さんが受諾
デバイスB → シグナリングサーバー:
{
  type: "call-accept",
  from: "佐藤花子",
  to: "田中太郎",
  callId: "call_12345",
  data: {
    answer: {
      type: "answer",
      sdp: "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n..."
    }
  }
}

// 4. サーバーが田中さんに転送
シグナリングサーバー → デバイスA:
{
  type: "call-accept",
  from: "佐藤花子",
  to: "田中太郎",
  callId: "call_12345",
  data: {
    answer: { ... }
  }
}

// 5. ICE候補の交換（複数回）
デバイスA → サーバー → デバイスB:
{
  type: "ice-candidate",
  candidate: "192.168.1.10:50000",
  ...
}

デバイスB → サーバー → デバイスA:
{
  type: "ice-candidate",
  candidate: "192.168.1.20:51000",
  ...
}

// 6. P2P接続が確立
// この後、シグナリングサーバーは使われなくなります
```

---

## 🏗️ シグナリングサーバーの実装方法

### 方法1: WebSocket

```javascript
// Node.js + ws ライブラリ
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 接続中のユーザーを管理
const clients = new Map(); // userId → WebSocket

wss.on('connection', (ws) => {
  let userId = null;
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'register':
        // ユーザーを登録
        userId = message.userId;
        clients.set(userId, ws);
        console.log(`User ${userId} connected`);
        break;
        
      case 'call-request':
      case 'call-accept':
      case 'ice-candidate':
      case 'call-end':
        // 相手にメッセージを転送
        const targetWs = clients.get(message.to);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(data);
          console.log(`Forwarded ${message.type} from ${message.from} to ${message.to}`);
        } else {
          console.log(`Target user ${message.to} not found or not connected`);
        }
        break;
    }
  });
  
  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  });
});

console.log('Signaling server running on ws://localhost:8080');
```

### 方法2: Socket.IO

```javascript
// Node.js + Socket.IO
const io = require('socket.io')(3000);

io.on('connection', (socket) => {
  let userId = null;
  
  socket.on('register', (data) => {
    userId = data.userId;
    socket.join(userId); // ルームに参加
    console.log(`User ${userId} registered`);
  });
  
  socket.on('call-request', (message) => {
    // 特定のユーザーに送信
    io.to(message.to).emit('call-request', message);
  });
  
  socket.on('call-accept', (message) => {
    io.to(message.to).emit('call-accept', message);
  });
  
  socket.on('ice-candidate', (message) => {
    io.to(message.to).emit('ice-candidate', message);
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
});
```

### 方法3: Firebase Realtime Database

```javascript
// クライアント側（React Native）
import database from '@react-native-firebase/database';

class FirebaseSignalingService {
  async sendMessage(message) {
    // Firebase に書き込み
    await database()
      .ref(`signaling/${message.to}/${message.callId}`)
      .set({
        ...message,
        timestamp: Date.now(),
      });
  }
  
  listenForMessages(userId) {
    // Firebase から読み取り
    database()
      .ref(`signaling/${userId}`)
      .on('child_added', (snapshot) => {
        const message = snapshot.val();
        this.handleMessage(message);
        
        // 処理済みメッセージを削除
        snapshot.ref.remove();
      });
  }
}
```

### 方法4: HTTP ロングポーリング（推奨しない）

```javascript
// 非効率だが、WebSocketが使えない環境向け
app.post('/api/signaling/send', (req, res) => {
  const message = req.body;
  // メッセージをキューに保存
  messageQueue.push(message);
  res.json({ success: true });
});

app.get('/api/signaling/receive/:userId', (req, res) => {
  const userId = req.params.userId;
  // 定期的にポーリング
  const messages = messageQueue.filter(m => m.to === userId);
  res.json({ messages });
});
```

---

## 🌍 シグナリングサーバーの配置場所

### パターン1: ローカル開発

```
同じWi-Fi内:

MacBook (サーバー)          iPhone A         iPhone B
    ↓                         ↓                 ↓
192.168.1.100:8080      192.168.1.101    192.168.1.102
         ↑                    ↓                 ↓
         └────────────────────┴─────────────────┘
              WebSocket接続
```

**メリット:**
- 費用ゼロ
- 高速
- デバッグしやすい

**デメリット:**
- 同じネットワーク内でしか使えない
- 外部からアクセスできない

---

### パターン2: クラウドサーバー

```
インターネット経由:

AWS / GCP / Heroku           iPhone A      iPhone B
     (サーバー)                 ↓             ↓
         ↓                  東京           大阪
wss://server.com:443          ↓             ↓
         ↑                    └─────┬───────┘
         └──────────────────────────┘
              WebSocket接続
```

**メリット:**
- どこからでもアクセス可能
- 本番環境に適している
- スケールしやすい

**デメリット:**
- サーバー費用が必要
- セキュリティ設定が必要
- メンテナンスが必要

---

### パターン3: サーバーレス（Firebase / PubNub）

```
Firebase Realtime Database

┌─────────────────────────┐
│   Firebase (Google)     │
│  - リアルタイム同期     │
│  - 自動スケーリング      │
│  - 無料枠あり           │
└─────────────────────────┘
         ↑       ↑
         │       │
    iPhone A  iPhone B
```

**メリット:**
- サーバー管理不要
- 無料枠で試せる
- 実装が簡単

**デメリット:**
- プロバイダー依存
- カスタマイズが制限される
- 大規模だと費用が高い

---

## 🔒 セキュリティの重要性

### 問題: 盗聴・改ざんのリスク

```
❌ 暗号化なし（HTTP / WS）:

デバイスA → [通話リクエスト] → サーバー → [通話リクエスト] → デバイスB
                ↑
            第三者が盗聴可能
            メッセージを改ざん可能
```

### 解決: 暗号化（HTTPS / WSS）

```
✅ 暗号化あり（HTTPS / WSS）:

デバイスA → [🔒暗号化データ] → サーバー → [🔒暗号化データ] → デバイスB
                ↑
            第三者は読めない
```

**必須事項:**
- WebSocket over TLS (wss://) を使用
- サーバー証明書（SSL/TLS）の設定
- ユーザー認証（トークンベース）

---

## 📊 現在の実装との比較

### 現在の実装（デモ用）

```typescript
// services/SignalingService.ts
private sendSignalingMessage(message: SignalingMessage): void {
  // ❌ 実際には何もしていない
  console.log('📡 Sending:', message);
  
  // ❌ ローカルでシミュレーション
  setTimeout(() => {
    this.simulateIncomingCall(message);
  }, 1000);
}
```

**問題点:**
- メッセージが実際には送信されない
- 同じデバイス内でのシミュレーションのみ
- 2台のデバイス間で通信できない

---

### 実装後（本番環境）

```typescript
// services/SignalingService.ts
import io from 'socket.io-client';

class SignalingService {
  private socket: any;
  
  async connect(user: User) {
    // ✅ 実際のサーバーに接続
    this.socket = io('wss://your-server.com', {
      auth: {
        token: user.authToken,
      },
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Connected to signaling server');
    });
    
    this.socket.on('call-request', (message: SignalingMessage) => {
      // ✅ 実際の着信を受信
      this.handleIncomingCall(message);
    });
  }
  
  async sendMessage(message: SignalingMessage) {
    // ✅ 実際にサーバーに送信
    this.socket.emit(message.type, message);
  }
}
```

**改善点:**
- 実際にメッセージが送信される
- 2台のデバイス間で通信可能
- インターネット経由で通話可能

---

## 🎯 よくある質問

### Q1: シグナリングサーバーは通話中もずっと必要？

**A:** いいえ。通話が確立したら不要です。

```
接続確立前: シグナリングサーバー必須
  ↓
接続確立後: P2P直接通信（サーバー不要）
  ↓
通話終了時: シグナリングサーバーで通知（推奨）
```

---

### Q2: シグナリングサーバーを経由するとデータ量が増える？

**A:** いいえ。音声・映像データはP2P直接通信です。

```
シグナリングサーバー経由:
- 通話リクエスト（数KB）
- SDP交換（数KB）
- ICE候補（数KB）
合計: 数十KB程度

P2P直接通信:
- 音声データ（数MB〜数十MB/分）
- 映像データ（数十MB〜数百MB/分）
```

---

### Q3: 自分でサーバーを作らないといけない？

**A:** いいえ。既存サービスも使えます。

**オプション:**
1. **自分で構築** - 最も柔軟、無料
2. **Firebase** - 簡単、無料枠あり
3. **PubNub** - 専門サービス、有料
4. **Twilio** - 完全なソリューション、高価

---

### Q4: WebRTCはP2Pなのに、なぜサーバーが必要？

**A:** 初期の「お見合い」のためです。

```
例え:
あなたと友人が公園で待ち合わせしたい

❌ 不可能:
直接探す → 公園が広すぎて見つからない

✅ 可能:
携帯電話で連絡 → 待ち合わせ場所を決める → 直接会う
            ↑
    シグナリングサーバー
```

---

## 📚 まとめ

### シグナリングサーバーとは

```
役割: WebRTC通話の「仲介役」
目的: 2台のデバイスが直接接続できるように情報を交換
必要な期間: 通話確立まで（通話中は不要）
実装方法: WebSocket、Socket.IO、Firebase など
```

### 現在のアプリに必要なこと

1. **シグナリングサーバーを立てる**
   - 簡易版: Node.js + WebSocket (30分)
   - 本格版: クラウド + 認証 (1-2日)

2. **アプリを修正**
   - `SignalingService.ts`でサーバーに接続
   - 実際にメッセージを送受信

3. **2台のデバイスでテスト**
   - Development Buildで起動
   - 実際の通話を確認

### 次のステップ

```bash
# まずはDevelopment Buildから
npx expo run:ios
```

その後、シグナリングサーバーの実装に進みます。

