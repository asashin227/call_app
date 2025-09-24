#!/bin/bash

set -e

echo "🚀 Starting Xcode Cloud post-clone script for CallKit App"
echo "📍 Initial working directory: $(pwd)"
echo "🖥️  System info: $(uname -a)"
echo "📂 Initial directory contents:"
ls -la

# CI_PROJECT_FILE_PATHが/iosに設定されているため、iosディレクトリがワーキングディレクトリ
# Xcode Cloud環境: /Volumes/workspace/repository/ios
# プロジェクトルート: /Volumes/workspace/repository

# Install Node.js and npm using Homebrew (most reliable on Xcode Cloud)
echo "📦 Installing Node.js and npm via Homebrew"

# Check if Homebrew is available, install if not
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon and Intel Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo "🍎 Apple Silicon detected, adding /opt/homebrew/bin to PATH"
        export PATH="/opt/homebrew/bin:$PATH"
        echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.bash_profile
    else
        echo "💻 Intel Mac detected, adding /usr/local/bin to PATH"
        export PATH="/usr/local/bin:$PATH"
        echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bash_profile
    fi
    
    # Reload PATH
    source ~/.bash_profile 2>/dev/null || true
fi

# Verify Homebrew installation
if command -v brew &> /dev/null; then
    echo "✅ Homebrew found: $(brew --version | head -n1)"
    
    # Update Homebrew
    echo "🔄 Updating Homebrew"
    brew update
    
    # Install Node.js
    echo "📦 Installing Node.js via Homebrew"
    brew install node@18
    
    # Add Node.js to PATH
    export PATH="/opt/homebrew/opt/node@18/bin:/usr/local/opt/node@18/bin:$PATH"
    
    # Link Node.js if needed
    brew link --force node@18 2>/dev/null || true
    
else
    echo "❌ Failed to install Homebrew"
    
    # Fallback: Download Node.js directly
    echo "📦 Fallback: Installing Node.js directly"
    NODE_VERSION="18.17.1"
    
    if [[ $(uname -m) == "arm64" ]]; then
        NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz"
    else
        NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz"
    fi
    
    cd /tmp
    curl -fsSL "$NODE_URL" -o node.tar.gz
    tar -xzf node.tar.gz
    
    NODE_DIR="/tmp/node-v${NODE_VERSION}-darwin-$(uname -m | sed 's/arm64/arm64/' | sed 's/x86_64/x64/')"
    export PATH="$NODE_DIR/bin:$PATH"
    
    # Return to original directory
    cd - > /dev/null
fi

# Verify Node.js and npm installation
echo "🔍 Verifying Node.js installation"
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js still not found"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo "✅ npm found: $(npm --version)"
else
    echo "❌ npm still not found"
    exit 1
fi

# Find project root directory
echo "📁 Searching for project root with package.json"
CURRENT_DIR=$(pwd)
echo "📍 Current directory: $CURRENT_DIR"

# Check current directory first (ios)
if [ -f "package.json" ]; then
    PROJECT_ROOT="$CURRENT_DIR"
    echo "✅ Found package.json in current directory: $PROJECT_ROOT"
# Check parent directory (most likely location)
elif [ -f "../package.json" ]; then
    PROJECT_ROOT="$(cd .. && pwd)"
    echo "✅ Found package.json in parent directory: $PROJECT_ROOT"
# Check workspace repository root
elif [ -f "/Volumes/workspace/repository/package.json" ]; then
    PROJECT_ROOT="/Volumes/workspace/repository"
    echo "✅ Found package.json in workspace root: $PROJECT_ROOT"
# Search up the directory tree
else
    echo "🔍 Searching up the directory tree for package.json"
    SEARCH_DIR="$CURRENT_DIR"
    while [ "$SEARCH_DIR" != "/" ]; do
        if [ -f "$SEARCH_DIR/package.json" ]; then
            PROJECT_ROOT="$SEARCH_DIR"
            break
        fi
        SEARCH_DIR="$(dirname "$SEARCH_DIR")"
    done
fi

# Verify project root was found
if [ -z "$PROJECT_ROOT" ]; then
    echo "❌ package.json not found in any parent directory"
    echo "📂 Directory tree from current location:"
    find $(pwd) -name "package.json" -type f 2>/dev/null || echo "No package.json files found"
    echo "📂 Contents of workspace repository:"
    ls -la /Volumes/workspace/repository/ 2>/dev/null || echo "Workspace repository not accessible"
    exit 1
fi

echo "🎯 Using project root: $PROJECT_ROOT"

# Navigate to project root and install npm dependencies
echo "📦 Installing npm dependencies in project root"
cd "$PROJECT_ROOT"

echo "📂 Project root directory contents:"
ls -la

# Verify package.json exists in project root
if [ -f "package.json" ]; then
    echo "✅ Confirmed package.json exists in: $(pwd)"
    
    # Clear npm cache to avoid issues
    npm cache clean --force
    
    # Install dependencies with verbose logging
    npm install --verbose --no-audit --no-fund
    
    echo "✅ npm install completed successfully"
else
    echo "❌ package.json still not found after navigation"
    exit 1
fi

# Install EAS CLI
echo "📦 Installing EAS CLI"
npm install -g @expo/eas-cli --no-audit --no-fund

# Verify EAS CLI installation
if command -v eas &> /dev/null; then
    echo "✅ EAS CLI installed: $(eas --version)"
else
    echo "⚠️ EAS CLI not in PATH, trying npx..."
fi

# Export iOS app
echo "🏗️ Exporting iOS app with Expo"
if command -v npx &> /dev/null; then
    npx expo export --platform ios
    echo "✅ Expo export completed"
else
    echo "❌ npx not available"
    exit 1
fi

# Navigate back to ios directory for CocoaPods
echo "🍫 Installing CocoaPods dependencies"

# Find ios directory relative to project root
if [ -d "$PROJECT_ROOT/ios" ]; then
    IOS_DIR="$PROJECT_ROOT/ios"
elif [ -d "$CURRENT_DIR" ]; then
    IOS_DIR="$CURRENT_DIR"
else
    echo "❌ iOS directory not found"
    exit 1
fi

echo "🎯 Using iOS directory: $IOS_DIR"
cd "$IOS_DIR"

# Verify we're in the ios directory and Podfile exists
if [ -f "Podfile" ]; then
    echo "✅ Found Podfile in: $(pwd)"
    
    # Verify CocoaPods is available
    if command -v pod &> /dev/null; then
        echo "✅ CocoaPods found: $(pod --version)"
    else
        echo "📦 Installing CocoaPods"
        sudo gem install cocoapods --no-document
    fi
    
    # Clean previous installations
    rm -rf Pods/ Podfile.lock 2>/dev/null || true
    
    # Install pods with verbose output
    pod install --repo-update --verbose
    
    echo "✅ CocoaPods installation completed"
else
    echo "❌ Podfile not found in $(pwd)"
    echo "📂 Contents of iOS directory:"
    ls -la
    exit 1
fi

echo "🎉 Post-clone script completed successfully"
echo "📍 Final working directory: $(pwd)"
echo "📊 Environment summary:"
echo "  - System: $(uname -a)"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - CocoaPods: $(pod --version 2>/dev/null || echo 'Not available')"
echo "  - Project Root: $PROJECT_ROOT"
echo "  - iOS Directory: $IOS_DIR"
echo "  - PATH: $PATH"