# Development Build 実行手順

react-native-webrtcなどのネイティブモジュールを使用するため、Development Buildが必要です。

## ✅ 完了した作業

- ✅ `npx expo prebuild --clean` でネイティブプロジェクト生成済み
- ✅ CocoaPods インストール済み

## 🚀 次のステップ

### オプション1: iOSシミュレーターで実行（簡単）

```bash
npx expo run:ios
```

**注意**: 
- WebRTCの音声通話はシミュレーターでも動作します
- より現実的なテストには実機の使用を推奨（オプション2）

### オプション2: iOS実機で実行（推奨）

#### 1. デバイスをMacに接続

#### 2. 実機を指定して実行

```bash
# 接続されているデバイスを確認
xcrun xctrace list devices

# 実機を指定して実行
npx expo run:ios --device
```

または、Xcodeから実行：

```bash
# Xcodeでプロジェクトを開く
open ios/CallApp.xcworkspace

# Xcodeで:
# 1. デバイスを選択
# 2. Apple Developer アカウントでサインイン
# 3. Signing & Capabilities タブでチームを選択
# 4. ▶ ボタンをクリック
```

### オプション3: EAS Buildでビルド（本番用）

```bash
# EAS CLIをインストール（未インストールの場合）
npm install -g eas-cli

# Expo アカウントでログイン
eas login

# Development Buildを作成
eas build --profile development --platform ios

# ビルド完了後、QRコードをスキャンしてインストール
```

## 🔧 トラブルシューティング

### エラー: "Signing for "CallApp" requires a development team"

**解決方法**:
1. Xcodeで `ios/CallApp.xcworkspace` を開く
2. プロジェクトを選択 → Signing & Capabilities
3. "Automatically manage signing" をチェック
4. Teamを選択（Apple Developer アカウントが必要）

### エラー: "App installation failed"

**解決方法**:
1. デバイスの「設定」→「一般」→「VPNとデバイス管理」
2. 開発者アプリを信頼する

### ビルドに時間がかかる場合

初回ビルドは10-20分かかる場合があります。2回目以降は高速になります。

## 📱 アプリの使い方

アプリが起動したら：

1. メイン画面で「手動シグナリング」をON
2. 「通話」ボタンをタップ
3. 「発信側」または「受信側」を選択
4. 画面に表示される情報をコピー&ペーストで交換
5. 通話開始！

## 💡 ヒント

- **2台のデバイス**でテストするのが理想的
- **同じWi-Fiネットワーク**に接続すると接続しやすい
- 情報の交換にはメッセージアプリやAirDropなどを使用

## 🎯 現在の状態

- ✅ 手動シグナリング機能: 実装済み（コピー&ペースト方式）
- ✅ WebRTC音声通話: 実装済み
- ⏳ Development Build: 作成中（このステップ）
- ⏳ 実機テスト: 次のステップ

