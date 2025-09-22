#!/bin/bash

set -e

echo "🚀 Starting Xcode Cloud post-clone script for CallKit App"

# Node.js setup
echo "📦 Setting up Node.js environment"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Install Node.js 18 (required for Expo)
echo "📦 Installing Node.js 18"
nvm install 18
nvm use 18

# Install npm dependencies
echo "📦 Installing npm dependencies"
npm install

# Install EAS CLI
echo "📦 Installing EAS CLI"
npm install -g @expo/eas-cli

# Export iOS app
echo "🏗️ Exporting iOS app with Expo"
npx expo export --platform ios

# Install CocoaPods dependencies
echo "🍫 Installing CocoaPods dependencies"
cd ios
pod install --repo-update
cd ..

echo "✅ Post-clone script completed successfully"
