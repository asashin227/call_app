# 🔊 音声経路の同期機能

## 概要

アプリUIとCallKitの両方から音声出力経路（スピーカー/イヤピース）を変更できるようにし、双方向で状態を同期させる機能です。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー操作                               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │ アプリUI  │         │ CallKit  │         │ Bluetooth │
  │ ボタン   │         │ ネイティブ│         │ デバイス  │
  └──────────┘         └──────────┘         └──────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
  ┌────────────────────────────────────────────────────┐
  │           AudioRouteService                         │
  │           (音声経路の状態管理とイベント配信)          │
  │                                                     │
  │  - currentRoute: AudioRoute                        │
  │  - isSpeakerEnabled: boolean                       │
  │  - listeners: Listener[]                           │
  │                                                     │
  │  Methods:                                          │
  │  - handleCallKitRouteChange()                      │
  │  - handleAppUIRouteChange()                        │
  │  - addListener()                                   │
  └────────────────────────────────────────────────────┘
        │                     │
        │                     └──────────┐
        ▼                                ▼
  ┌──────────────┐              ┌────────────────┐
  │ CallScreen   │              │  InCallManager │
  │ (UI状態更新)  │              │  (実際の音声制御)│
  └──────────────┘              └────────────────┘
```

## 主要コンポーネント

### 1. AudioRouteService

**ファイル**: `services/AudioRouteService.ts`

音声経路の状態を一元管理し、アプリUIとCallKitの変更を同期させるサービス。

#### 主要メソッド

##### `handleCallKitRouteChange(route: AudioRoute, reason: number)`
CallKitからの音声経路変更を処理

- **呼び出し元**: `app/_layout.tsx`の`didChangeAudioRoute`イベント
- **処理内容**:
  1. 現在の音声経路を更新
  2. スピーカー状態を更新（`route === 'Speaker'`）
  3. すべてのリスナーにイベントを通知

##### `handleAppUIRouteChange(speakerEnabled: boolean)`
アプリUIからの音声経路変更を処理

- **呼び出し元**: `components/CallScreen.tsx`の`toggleSpeaker()`
- **処理内容**:
  1. スピーカー状態を更新
  2. Bluetooth/ヘッドセット接続中でなければ経路を更新
  3. すべてのリスナーにイベントを通知

##### `addListener(listener: Function): UnsubscribeFunction`
音声経路変更のリスナーを追加

- **呼び出し元**: `components/CallScreen.tsx`のuseEffect
- **戻り値**: リスナーを削除する関数

#### 音声経路の種類（AudioRoute）

```typescript
type AudioRoute = 
  | 'Receiver'      // イヤピース（受話口）
  | 'Speaker'       // スピーカー
  | 'Bluetooth'     // Bluetoothデバイス（AirPodsなど）
  | 'HeadsetInOut'  // 有線ヘッドセット
  | 'Unknown';      // 不明
```

### 2. app/_layout.tsx

**役割**: CallKitイベントをリッスンして`AudioRouteService`に通知

#### 実装箇所

```typescript
RNCallKeep.addEventListener('didChangeAudioRoute', (data) => {
  console.log('🎧 CallKit: Audio route changed -', data);
  console.log(`- Reason: ${data.reason}, Output: ${data.output}`);
  
  // AudioRouteServiceに通知して、アプリUI側と同期
  const route = (data.output || 'Unknown') as AudioRoute;
  audioRouteService.handleCallKitRouteChange(route, data.reason || 0);
});
```

#### 変更理由コード（data.reason）

| コード | 理由 | 説明 |
|--------|------|------|
| 1 | Unknown | 不明な理由 |
| 2 | NewDeviceAvailable | 新しいデバイスが利用可能 |
| 3 | CategoryChange | オーディオカテゴリ変更 |
| 4 | Override | 手動で上書き |
| 5 | WakeFromSleep | スリープからの復帰 |
| 6 | RouteConfigurationChange | ルート設定変更 |

### 3. components/CallScreen.tsx

**役割**: UI状態を管理し、`AudioRouteService`とInCallManagerを連携

#### 実装箇所

##### リスナーの設定（useEffect）

```typescript
useEffect(() => {
  const unsubscribe = audioRouteService.addListener((event) => {
    // スピーカー状態を更新
    const newSpeakerState = event.route === 'Speaker';
    
    // UI状態が異なる場合のみ更新
    if (isSpeakerEnabled !== newSpeakerState) {
      setIsSpeakerEnabled(newSpeakerState);
      
      // InCallManagerにも反映
      InCallManager.setForceSpeakerphoneOn(newSpeakerState);
    }
  });
  
  return () => unsubscribe();
}, [isSpeakerEnabled]);
```

##### スピーカー切り替え（toggleSpeaker）

```typescript
const toggleSpeaker = useCallback(() => {
  const newSpeakerState = !isSpeakerEnabled;
  
  // UI状態を更新
  setIsSpeakerEnabled(newSpeakerState);
  
  // InCallManagerで実際の音声経路を変更
  InCallManager.setForceSpeakerphoneOn(newSpeakerState);
  
  // AudioRouteServiceに通知（アプリUI側からの変更）
  audioRouteService.handleAppUIRouteChange(newSpeakerState);
}, [isSpeakerEnabled]);
```

## 処理フロー

### ケース1: アプリUIからの音声経路変更

```
1. ユーザーがスピーカーボタンをタップ
   ↓
2. CallScreen.toggleSpeaker() が実行
   ↓
3. setIsSpeakerEnabled(newState) でUI状態更新
   ↓
4. InCallManager.setForceSpeakerphoneOn() で実際の音声経路変更
   ↓
5. audioRouteService.handleAppUIRouteChange() に通知
   ↓
6. AudioRouteServiceが内部状態を更新
   ↓
7. 全リスナーにイベントを配信
   ↓
8. CallScreenのリスナーが呼ばれるが、状態が同じなので何もしない
   ↓
9. CallKitの didChangeAudioRoute イベントが発火（iOS側）
   ↓
10. _layout.tsxが受信してAudioRouteServiceに通知
   ↓
11. AudioRouteServiceが再度リスナーに通知
   ↓
12. CallScreenで状態確認（既に同期済みなのでスキップ）
```

### ケース2: CallKitネイティブUIからの音声経路変更

```
1. ユーザーがCallKitの音声ボタンをタップ
   ↓
2. iOSがAudio Sessionを更新
   ↓
3. CallKitの didChangeAudioRoute イベントが発火
   ↓
4. _layout.tsx が受信
   ↓
5. audioRouteService.handleCallKitRouteChange() を呼び出し
   ↓
6. AudioRouteServiceが内部状態を更新
   ↓
7. 全リスナーにイベントを配信
   ↓
8. CallScreenのリスナーが呼ばれる
   ↓
9. UI状態が異なる場合：
   - setIsSpeakerEnabled() でUI状態更新
   - InCallManager.setForceSpeakerphoneOn() で同期
   ↓
10. UI状態が同じ場合：
    - 何もしない（ログ出力のみ）
```

### ケース3: Bluetoothデバイスの接続/切断

```
1. Bluetoothデバイスが接続される
   ↓
2. iOSが自動的に音声経路を変更
   ↓
3. CallKitの didChangeAudioRoute イベントが発火
   (reason: 6, output: 'Bluetooth')
   ↓
4. _layout.tsx が受信
   ↓
5. audioRouteService.handleCallKitRouteChange('Bluetooth', 6)
   ↓
6. AudioRouteService内部状態:
   - currentRoute = 'Bluetooth'
   - isSpeakerEnabled = false (Bluetoothはスピーカーではない)
   ↓
7. CallScreenのリスナーが呼ばれる
   ↓
8. UI状態を更新（スピーカーボタンはOFF）
   ↓
9. InCallManagerに反映（実際の音声はBluetoothへ）
```

## ログの見方

実装には詳細なログ出力が含まれています。以下は主要なログとその意味：

### AudioRouteService

```
🎧 AudioRouteService: CallKit route changed to Speaker (reason: 4)
→ CallKitから音声経路変更を受信

🎧 AudioRouteService: Route updated Receiver → Speaker, Speaker: true
→ 内部状態が更新された

🎧 AudioRouteService: App UI route change to Speaker: true
→ アプリUIから音声経路変更を受信

🎧 AudioRouteService: Listener added (total: 1)
→ リスナーが登録された
```

### CallScreen

```
🔊 CallScreen: App UI toggling speaker: false → true
→ ユーザーがスピーカーボタンをタップ

🎧 CallScreen: Received audio route change event: { route: 'Speaker', reason: 4, ... }
→ AudioRouteServiceからイベントを受信

🎧 CallScreen: Updating speaker state: false → true
→ UI状態を更新中

🎧 CallScreen: Speaker state already in sync (true)
→ 状態が既に同期済み（更新不要）
```

### _layout.tsx

```
🎧 CallKit: Audio route changed - { reason: 4, output: 'Speaker' }
→ CallKitからイベントを受信
```

## 特殊なケースの処理

### 1. Bluetooth接続中にスピーカーボタンを押した場合

現在の実装では、Bluetooth接続中はスピーカーへの切り替えを抑制します：

```typescript
if (this.currentRoute !== 'Bluetooth' && this.currentRoute !== 'HeadsetInOut') {
  // スピーカー/イヤピースに変更
} else {
  // Bluetoothデバイス接続中は変更しない
  console.log('External device connected, keeping route');
}
```

### 2. 複数のリスナーが登録されている場合

`AudioRouteService`は複数のリスナーをサポートしており、すべてのリスナーに順次通知します。エラーが発生しても他のリスナーには影響しません。

### 3. 通話終了時のクリーンアップ

`CallScreen`がアンマウントされると、リスナーは自動的に削除されます：

```typescript
return () => {
  console.log('🎧 CallScreen: Removing AudioRouteService listener');
  unsubscribe();
};
```

## 利点

✅ **双方向同期**: アプリUIとCallKitの両方からの変更を正しく反映

✅ **状態の一元管理**: `AudioRouteService`が唯一の情報源

✅ **デバッグしやすい**: 詳細なログ出力により問題の特定が容易

✅ **拡張性**: 新しいリスナーを簡単に追加可能

✅ **競合回避**: 同じ状態への重複更新を防止

## テスト方法

### 1. アプリUIからの変更

1. 通話を開始
2. CallScreen上のスピーカーボタンをタップ
3. 音声がスピーカーから出力されることを確認
4. CallKitのネイティブUIでもスピーカーがONになっていることを確認

### 2. CallKitからの変更

1. 通話中にCallKitのネイティブUI（右上）を開く
2. スピーカーボタンをタップ
3. 音声がスピーカーから出力されることを確認
4. CallScreen上のスピーカーボタンもONになることを確認

### 3. Bluetooth接続

1. Bluetoothヘッドセットを接続
2. 通話を開始
3. 音声がBluetoothデバイスから出力されることを確認
4. CallScreen上のスピーカーボタンがOFFになることを確認
5. Bluetoothを切断
6. 音声が自動的にイヤピースに戻ることを確認

## トラブルシューティング

### 問題: UI状態が同期しない

**原因**: リスナーが正しく登録されていない

**解決方法**:
1. ログで`🎧 CallScreen: Setting up AudioRouteService listener`を確認
2. `total: 1`のようにリスナー数が表示されることを確認

### 問題: スピーカーボタンを押しても音声が変わらない

**原因**: InCallManagerの初期化エラー

**解決方法**:
1. ログで`📞 CallScreen: Starting InCallManager for WebRTC`を確認
2. エラーメッセージがないか確認
3. アプリを再起動

### 問題: CallKitからの変更が反映されない

**原因**: `didChangeAudioRoute`イベントが発火していない

**解決方法**:
1. ログで`🎧 CallKit: Audio route changed`を確認
2. CallKitが正しくセットアップされているか確認
3. 実機でテスト（シミュレーターでは制限あり）

## まとめ

この実装により、アプリUIとCallKitの両方から音声出力経路を制御でき、双方向で状態が完全に同期されます。`AudioRouteService`を中心としたイベント駆動アーキテクチャにより、拡張性と保守性が高い設計になっています。

