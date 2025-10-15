# WebRTC機能の有効化手順

このドキュメントでは、アプリでWebRTC機能を有効化するための手順を説明します。

## 現在の状況

- `react-native-webrtc`はインストール済み
- Expo SDK 51にダウングレード済み
- WebRTC関連コードは一時的に無効化されています

## WebRTC機能を有効化する方法

### 方法1: Expo Development Build（推奨）

Expo Development Buildを使用すると、Expoの利便性を保ちながらカスタムネイティブモジュールを使用できます。

#### 手順

1. **Expo Development Clientをインストール**
   ```bash
   npm install expo-dev-client
   ```

2. **Development Buildを作成**
   
   **ローカルビルド（推奨）:**
   ```bash
   # iOS
   npx expo run:ios
   
   # Android
   npx expo run:android
   ```
   
   **EAS Build（クラウドビルド）:**
   ```bash
   # EAS CLIをインストール
   npm install -g eas-cli
   
   # EASにログイン
   eas login
   
   # プロジェクトを設定
   eas build:configure
   
   # Development Buildを作成
   eas build --profile development --platform ios
   eas build --profile development --platform android
   ```

3. **WebRTC関連コードを有効化**
   
   `app/(tabs)/index.tsx`で以下の変更を行います：
   
   ```typescript
   // コメントアウトを解除
   import WebRTCCallModal from '@/components/WebRTCCallModal';
   import { signalingService } from '@/services/SignalingService';
   
   // デフォルト値を変更
   const [enableWebRTC, setEnableWebRTC] = useState(true); // falseからtrueに変更
   ```

4. **アプリを起動**
   ```bash
   npx expo start --dev-client
   ```

### 方法2: Expo Bare Workflowへの完全移行

より詳細なネイティブコントロールが必要な場合：

```bash
# Expo Configを生成
npx expo prebuild

# ネイティブプロジェクトを直接実行
npx expo run:ios
npx expo run:android
```

## WebRTC機能の使用方法

1. アプリを起動後、発信画面で「WebRTC通話を使用」スイッチをオンにする
2. 必要に応じて「ビデオ通話」スイッチもオンにする
3. 通話先のユーザー名を入力
4. 「Call」ボタンを押して通話を開始

## トラブルシューティング

### ビルドエラーが発生する場合

1. **キャッシュをクリア**
   ```bash
   # Node modules
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   
   # iOS Pods
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   
   # Metro bundler cache
   npx expo start --clear
   ```

2. **Xcode設定を確認**
   - Xcode 16.2以降を使用
   - Developer証明書が有効か確認
   - Simulatorではなく実機での動作確認を推奨

3. **権限設定を確認**
   `Info.plist`に以下が含まれていることを確認：
   - `NSMicrophoneUsageDescription`
   - `NSCameraUsageDescription`

### react-native-webrtcが見つからない場合

```bash
# パッケージを再インストール
npm uninstall react-native-webrtc
npm install react-native-webrtc@118.0.7 --legacy-peer-deps

# iOS Podsを再インストール
cd ios
pod install
cd ..
```

### シミュレーターでの制限

- WebRTCはiOSシミュレーターでは完全に動作しない場合があります
- カメラ・マイク機能は実機でのみ動作します
- **実機でのテストを強く推奨します**

## 現在のファイル構成

WebRTC機能に関連するファイル：

- `services/WebRTCService.ts` - WebRTCの中核ロジック
- `services/SignalingService.ts` - シグナリング管理
- `components/CallScreen.tsx` - 通話画面UI
- `components/WebRTCCallModal.tsx` - 通話モーダル
- `app/(tabs)/index.tsx` - メイン画面（WebRTC有効化スイッチ）

## 注意事項

- WebRTC機能は実際のP2P通話を実現します
- 現在の実装はデモ環境用で、実運用には追加のシグナリングサーバーが必要です
- STUNサーバーはGoogleの公開サーバーを使用していますが、本番環境では独自のサーバーを推奨します

## サポートされているプラットフォーム

- ✅ iOS 13.0以降（実機）
- ✅ Android 5.0以降
- ❌ iOS Simulator（制限あり）
- ❌ Android Emulator（制限あり）
- ❌ Web（react-native-webrtcは非対応）

## 次のステップ

1. Development Buildを作成
2. WebRTC関連コードを有効化
3. 実機でテスト
4. 必要に応じてシグナリングサーバーを実装

