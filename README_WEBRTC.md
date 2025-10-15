# WebRTC機能について

このドキュメントでは、アプリのWebRTC機能について説明します。

## 現在の状況

- ✅ `react-native-webrtc`はインストール済み
- ✅ Expo SDK 51で動作
- ✅ **手動シグナリング機能が実装済み**（シグナリングサーバー不要）
- ✅ CallKit統合済み
- ✅ グローバル通話画面実装済み
- ❌ 自動シグナリング機能は削除されました（シンプル化のため）

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

3. **アプリを起動**
   ```bash
   # Development Buildの場合
   npx expo start --dev-client
   
   # または直接起動
   npx expo run:ios --device
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

### 手動シグナリングモード（推奨）

1. メイン画面で「Manual Signaling」ボタンをタップ
2. 発信側（Caller）または受信側（Receiver）を選択
3. 画面の指示に従って以下を交換：
   - SDP Offer/Answer
   - ICE候補
4. 接続が確立すると、**どの画面にいても自動的に通話画面が表示**されます
5. 通話画面の機能：
   - ミュート/ミュート解除
   - スピーカー切り替え（デフォルト: イヤピース）
   - カメラオン/オフ（ビデオ通話時）
   - 通話終了

📚 **詳細**: [手動シグナリングガイド](docs/MANUAL_SIGNALING_GUIDE.md)を参照

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
- マイク機能は実機でのみ動作します
- **実機でのテストを強く推奨します**

## 現在のファイル構成

WebRTC機能に関連するファイル：

- `services/WebRTCService.ts` - WebRTCの中核ロジック（P2P接続、メディア管理）
- `components/CallScreen.tsx` - 通話画面UI（グローバルモーダル）
- `app/_layout.tsx` - グローバル通話画面の管理とCallKit統合
- `app/manual-signaling/` - 手動シグナリング画面
  - `caller-step1.tsx` - 発信側ステップ1（Offer生成）
  - `caller-step3.tsx` - 発信側ステップ3（ICE候補交換）
  - `receiver-step1.tsx` - 受信側ステップ1（Offer受信、Answer生成）
  - `receiver-step2.tsx` - 受信側ステップ2（ICE候補交換）
- `contexts/ManualSignalingContext.tsx` - 手動シグナリング状態管理
- `utils/uuid.ts` - UUID生成（CallKeep用）

## 注意事項

- ✅ WebRTC機能は実際のP2P通話を実現します
- ✅ **手動シグナリングモード**ではシグナリングサーバー不要でテスト可能
- ⚠️ 自動シグナリング機能は削除されました（シンプル化のため）
- ⚠️ 本番環境で自動シグナリングが必要な場合は、別途実装が必要です
- 📌 STUNサーバーはGoogleの公開サーバーを使用（本番環境では独自サーバー推奨）
- 📌 CallKitとの統合により、ネイティブな通話体験を提供
- 📌 通話画面はグローバルモーダルとして実装されており、どの画面でも表示可能

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

