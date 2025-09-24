#!/bin/bash

set -e

echo "🚀 Starting Xcode Cloud post-clone script for CallKit App"
echo "📍 Working directory: $(pwd)"

# CI_PROJECT_FILE_PATHが/iosに設定されているため、iosディレクトリがワーキングディレクトリ
# プロジェクトルートは一つ上のディレクトリ

# Node.js environment check (Xcode Cloud has Node.js pre-installed)
echo "📦 Checking Node.js environment"
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found, attempting to install"
    # Try to install Node.js via Homebrew if available
    if command -v brew &> /dev/null; then
        echo "📦 Installing Node.js via Homebrew"
        brew install node@18
        # Add Homebrew paths
        export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
    else
        echo "❌ Neither Node.js nor Homebrew available"
        exit 1
    fi
fi

# Verify npm is available
if command -v npm &> /dev/null; then
    echo "✅ npm found: $(npm --version)"
else
    echo "❌ npm not found"
    exit 1
fi

# プロジェクトルートに移動してnpm install実行
echo "📦 Installing npm dependencies (in project root)"
cd ..

# Verify we're in the right directory
if [ -f "package.json" ]; then
    echo "✅ Found package.json, installing dependencies"
    npm install --verbose
else
    echo "❌ package.json not found in $(pwd)"
    echo "📂 Contents of current directory:"
    ls -la
    exit 1
fi

# Install EAS CLI
echo "📦 Installing EAS CLI"
npm install -g @expo/eas-cli

# Verify EAS CLI installation
if command -v eas &> /dev/null; then
    echo "✅ EAS CLI installed: $(eas --version)"
else
    echo "⚠️ EAS CLI not in PATH, but continuing..."
fi

# Export iOS app
echo "🏗️ Exporting iOS app with Expo"
if command -v npx &> /dev/null; then
    npx expo export --platform ios
else
    echo "❌ npx not available"
    exit 1
fi

# iosディレクトリに戻ってCocoaPods実行
echo "🍫 Installing CocoaPods dependencies (in ios directory)"
cd ios

# Verify we're in the ios directory and Podfile exists
if [ -f "Podfile" ]; then
    echo "✅ Found Podfile, installing CocoaPods dependencies"
    
    # Verify CocoaPods is available
    if command -v pod &> /dev/null; then
        echo "✅ CocoaPods found: $(pod --version)"
    else
        echo "📦 Installing CocoaPods"
        sudo gem install cocoapods
    fi
    
    # Install pods with verbose output
    pod install --repo-update --verbose
else
    echo "❌ Podfile not found in $(pwd)"
    echo "📂 Contents of ios directory:"
    ls -la
    exit 1
fi

echo "✅ Post-clone script completed successfully"
echo "📍 Final working directory: $(pwd)"
echo "📊 Environment summary:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - CocoaPods: $(pod --version)"