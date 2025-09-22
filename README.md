# CallKit Example App 📞

A React Native/Expo application demonstrating **iOS CallKit** integration with audio session management. This project showcases how to implement native calling experience with outgoing and incoming call screens.

**CallKitとオーディオセッション管理を統合したReact Native/Expoアプリケーションです。ネイティブな通話体験を提供する発信・受信画面の実装例を紹介します。**

## ✨ Features / 機能

### 📱 Core Functionality / 基本機能
- **Outgoing Calls / 発信機能**: Account-based calling with generic handle type
- **Incoming Calls / 受信機能**: Simulated incoming calls with customizable delay
- **CallKit Integration / CallKit統合**: Native iOS phone UI experience
- **Audio Session Management / オーディオセッション管理**: Call tones and audio playback
- **Permission Handling / 権限管理**: Microphone and CallKit permissions
- **Real-time Countdown / リアルタイムカウントダウン**: Visual feedback for incoming calls

### 🎵 Audio Features / 音声機能
- **Call Tone Simulation / 通話音シミュレーション**: Dial, ring, busy, connected, disconnect tones
- **Audio Service / オーディオサービス**: Centralized audio management with expo-av
- **Volume Control / 音量制御**: Different volume levels for each tone type
- **Background Audio / バックグラウンド音声**: Continues playing during CallKit sessions

## 🛠️ Tech Stack / 技術スタック

- **Framework**: Expo SDK with React Native
- **CallKit**: react-native-callkeep for iOS native calling
- **Audio**: expo-av for audio session management
- **Routing**: Expo Router with file-based navigation
- **TypeScript**: Full TypeScript implementation
- **Platform**: iOS focus (CallKit is iOS-specific)

## 📋 Requirements / 動作環境

### System Requirements / システム要件
- **macOS**: Latest version for iOS development
- **Xcode**: 15.0 or later
- **iOS Device**: Physical device required (CallKit limitations on simulator)
- **Apple Developer Account**: For CallKit entitlements

### Development Environment / 開発環境
- **Node.js**: 18.x or later
- **npm**: 9.x or later
- **Expo CLI**: Latest version
- **CocoaPods**: For iOS dependencies

## 🚀 Installation & Setup / インストール・セットアップ

### 1. Clone the Repository / リポジトリのクローン
```bash
git clone git@github.com:asashin227/call_app.git
cd call_app
```

### 2. Install Dependencies / 依存関係のインストール
```bash
# Install npm packages
npm install

# Install iOS dependencies
cd ios && pod install && cd ..
```

### 3. Configure Apple Developer Settings / Apple Developer設定

#### Required Entitlements / 必要な権限
Add the following to your Apple Developer Portal:
```
com.apple.developer.callkit.incoming-voip
```

#### Bundle Identifier / バンドル識別子
Update in `app.json`:
```json
"ios": {
  "bundleIdentifier": "your.bundle.identifier",
  "appleTeamId": "YOUR_TEAM_ID"
}
```

### 4. iOS Configuration / iOS設定

The following configurations are already set up:
```xml
<!-- ios/callapp/Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>このアプリは通話機能にマイクを使用します。CallKitによる通話にはマイクのアクセス権が必要です。</string>

<key>UIBackgroundModes</key>
<array>
  <string>voip</string>
</array>
```

## ▶️ Running the App / アプリの実行

### Development Build / 開発ビルド
```bash
# Start Expo development server
npx expo start

# Run on iOS device (recommended for CallKit)
npx expo run:ios --device

# Run on iOS simulator (limited CallKit functionality)
npx expo run:ios
```

### Production Build / プロダクションビルド
```bash
# Create production build
npx expo build:ios --type app-store
```

## 📱 Screen Overview / 画面構成

### 🔺 Outgoing Call Screen / 発信画面
**Path**: `app/(tabs)/index.tsx`
- **Input Field / 入力欄**: Account name or username input
- **Call Button / 通話ボタン**: Triggers CallKit outgoing call
- **Features / 機能**:
  - Account-based calling (generic handle type)
  - Microphone permission handling
  - Audio session management
  - Debug information display

### 🔻 Incoming Call Screen / 受信画面  
**Path**: `app/(tabs)/explore.tsx`
- **Phone Number Field / 電話番号欄**: Caller's phone number
- **Display Name Field / 表示名欄**: Caller's display name  
- **Delay Setting / 遅延設定**: Configurable delay (0-300 seconds)
- **Features / 機能**:
  - Real-time countdown display
  - Cancelable incoming call simulation
  - CallKit incoming call integration
  - Visual feedback during delay

## 📞 CallKit Implementation / CallKit実装詳細

### Core Components / 主要コンポーネント

#### 1. CallKit Setup / CallKit設定
**File**: `app/_layout.tsx`
```typescript
const options = {
  ios: {
    appName: 'Call App',
    handleType: 'generic',
    supportedHandleTypes: ['generic'],
    supportsVideo: false,
    includesCallsInRecents: true,
  }
};
```

#### 2. Event Listeners / イベントリスナー
- `answerCall`: Handle call acceptance
- `endCall`: Handle call termination  
- `didDisplayIncomingCall`: Incoming call display events
- `didReceiveStartCallAction`: Outgoing call initiation

#### 3. Audio Service / オーディオサービス
**File**: `services/AudioService.ts`
- Singleton pattern for centralized audio management
- State-based audio playback (outgoing, ringing, connected, ended)
- Automatic cleanup and resource management

## 🎵 Audio System / オーディオシステム

### Audio Types / 音声タイプ
```typescript
'dial'      // 発信音 - Dial tone during outgoing calls
'ring'      // 着信音 - Ring tone for incoming calls  
'busy'      // 話し中音 - Busy signal
'connected' // 接続音 - Brief tone when call connects
'disconnect'// 切断音 - Tone when call ends
```

### Audio Flow / 音声フロー
```
Outgoing: dial → connected → disconnect
Incoming: ring → connected → disconnect
```

### Adding Real Audio Files / 実際の音声ファイル追加

1. Create directory: `assets/sounds/`
2. Add audio files:
   ```
   assets/sounds/
   ├── dial.mp3
   ├── ring.mp3
   ├── busy.mp3
   ├── connected.mp3
   └── disconnect.mp3
   ```
3. Files automatically detected by `AudioService.getAudioPath()`

## ⚠️ Important Notes / 重要な注意事項

### CallKit Limitations / CallKit制限事項
- **Physical Device Required / 実機必須**: CallKit requires physical iOS device
- **Apple Developer Account / Apple Developer アカウント**: Required for CallKit entitlements
- **iOS Only / iOS専用**: CallKit is iOS-specific technology
- **VoIP Background Mode / VoIP バックグラウンドモード**: Required in Info.plist

### Permission Requirements / 必要な権限
- **Microphone / マイク権限**: Required for audio functionality
- **CallKit Entitlements / CallKit権限**: Required in provisioning profile
- **Background App Refresh / バックグラウンド更新**: Recommended for VoIP functionality

## 🐛 Troubleshooting / トラブルシューティング

### Common Issues / よくある問題

#### CallKit Not Working / CallKitが動作しない
1. Check provisioning profile includes CallKit entitlements
2. Verify bundle identifier matches Apple Developer Portal
3. Ensure running on physical device, not simulator
4. Check console logs for detailed error messages

#### Audio Not Playing / 音声が再生されない
1. Verify microphone permissions granted
2. Check audio files exist in `assets/sounds/`
3. Ensure device is not in silent mode
4. Check `expo-av` audio session configuration

#### Build Failures / ビルド失敗
1. Run `pod install` in `ios/` directory
2. Clean Xcode build folder
3. Restart Metro bundler: `npx expo start --clear`
4. Check Xcode console for detailed errors

### Debug Commands / デバッグコマンド
```bash
# Clear caches
npx expo start --clear
npm cache clean --force

# Reset iOS build
cd ios && pod install --repo-update && cd ..
npx expo run:ios --device --clear-cache

# Check permissions
# Enable Debug → Console in Xcode for detailed logs
```

## 📚 References / 参考資料

- [CallKit Documentation](https://developer.apple.com/documentation/callkit)
- [react-native-callkeep](https://github.com/react-native-webrtc/react-native-callkeep)
- [expo-av Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [Expo Router](https://docs.expo.dev/router/introduction/)

## 📄 License / ライセンス

This project is created for educational and demonstration purposes. Please ensure proper licensing for any audio files used in production.

**このプロジェクトは教育・デモンストレーション目的で作成されています。本番環境で使用する音声ファイルは適切なライセンスを確認してください。**

---

## 🤝 Contributing / 貢献

Feel free to submit issues and pull requests to improve this CallKit implementation example.

**このCallKit実装例の改善のため、IssueやPull Requestを歓迎します。**