#!/bin/bash

set -e

echo "🚀 Starting Xcode Cloud post-clone script for CallKit App"
echo "📍 Working directory: $(pwd)"

# CI_PROJECT_FILE_PATHが/iosに設定されているため、iosディレクトリがワーキングディレクトリ
# プロジェクトルートは一つ上のディレクトリ

# Node.js setup
echo "📦 Setting up Node.js environment"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Install Node.js 18 (required for Expo)
echo "📦 Installing Node.js 18"
nvm install 18
nvm use 18

# プロジェクトルートに移動してnpm install実行
echo "📦 Installing npm dependencies (in project root)"
cd ..
npm install

# Install EAS CLI
echo "📦 Installing EAS CLI"
npm install -g @expo/eas-cli

# Export iOS app
echo "🏗️ Exporting iOS app with Expo"
npx expo export --platform ios

# iosディレクトリに戻ってCocoaPods実行
echo "🍫 Installing CocoaPods dependencies (in ios directory)"
cd ios
pod install --repo-update

echo "✅ Post-clone script completed successfully"
echo "📍 Final working directory: $(pwd)"
