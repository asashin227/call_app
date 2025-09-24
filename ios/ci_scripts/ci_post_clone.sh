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

# Check if @react-native-community/cli is in package.json and add if missing
echo "🔍 Checking for required React Native CLI dependency"
if [ -f "package.json" ]; then
    if ! grep -q "@react-native-community/cli" package.json; then
        echo "📦 Adding @react-native-community/cli to devDependencies"
        
        # Create a temporary Node script to add the dependency
        cat > add_dependency.js << 'EOF'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
}

// Add missing React Native dependencies
packageJson.devDependencies['@react-native-community/cli'] = '^12.0.0';
packageJson.devDependencies['@react-native-community/cli-platform-ios'] = '^12.0.0';

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Added React Native CLI dependencies to package.json');
EOF
        
        node add_dependency.js
        rm add_dependency.js
        
        echo "📄 Updated package.json devDependencies:"
        grep -A 5 -B 1 "@react-native-community/cli" package.json || echo "Dependency check failed"
    else
        echo "✅ @react-native-community/cli already present in package.json"
    fi
    
    # Clear npm cache to avoid issues
    npm cache clean --force
    
    # Install dependencies with verbose logging
    npm install --verbose --no-audit --no-fund
    
    echo "✅ npm install completed successfully"
else
    echo "❌ package.json still not found after navigation"
    exit 1
fi

# Install Expo CLI globally (required for prebuild)
echo "📦 Installing Expo CLI globally"
npm install -g @expo/cli --no-audit --no-fund

# Also try to install via different methods for redundancy
echo "📦 Installing Expo CLI via multiple methods for redundancy"
npm install -g expo-cli@latest --no-audit --no-fund 2>/dev/null || echo "⚠️ Legacy expo-cli install failed (this is ok)"
npm install @expo/cli --save-dev --no-audit --no-fund || echo "⚠️ Local Expo CLI install failed (this is ok)"

# Update PATH to include npm global and local binaries
export PATH="$PROJECT_ROOT/node_modules/.bin:$(npm config get prefix)/bin:$PATH"
echo "🔄 Updated PATH: $PATH"

# Comprehensive CLI verification
echo "🔍 Comprehensive CLI verification"
echo "📍 Current working directory: $(pwd)"
echo "📊 Node ecosystem status:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - npm prefix: $(npm config get prefix)"
echo "  - npm global bin: $(npm config get prefix)/bin"

echo "🔍 Searching for Expo CLI executables:"
# Check various locations
which expo 2>/dev/null && echo "✅ expo found in PATH: $(which expo)" || echo "❌ expo not found in PATH"
which npx 2>/dev/null && echo "✅ npx found in PATH: $(which npx)" || echo "❌ npx not found in PATH"

# Check local node_modules
if [ -f "node_modules/.bin/expo" ]; then
    echo "✅ Local expo found: node_modules/.bin/expo"
    ls -la node_modules/.bin/expo
    echo "📄 Local expo version: $(./node_modules/.bin/expo --version 2>/dev/null || echo 'Version check failed')"
else
    echo "❌ Local expo not found in node_modules/.bin/"
fi

# Check global npm modules
echo "📦 Global npm modules with expo:"
npm list -g --depth=0 2>/dev/null | grep expo || echo "No global expo packages found"

# Check if npx can find expo
echo "🔍 Testing npx expo availability:"
if npx --version &> /dev/null; then
    echo "✅ npx available: $(npx --version)"
    if npx expo --version &> /dev/null; then
        echo "✅ npx expo available: $(npx expo --version)"
    else
        echo "❌ npx expo not working"
    fi
else
    echo "❌ npx not available"
fi

# Verify React Native CLI is available
echo "🔍 Verifying React Native CLI availability:"
if [ -f "node_modules/@react-native-community/cli/build/bin.js" ]; then
    echo "✅ React Native CLI found in node_modules"
else
    echo "❌ React Native CLI not found in node_modules"
fi

# Check app.json/app.config.js for Expo configuration
echo "🔍 Checking Expo project configuration:"
if [ -f "app.json" ]; then
    echo "✅ app.json found"
    echo "📄 app.json preview (first 20 lines):"
    head -n 20 app.json
elif [ -f "app.config.js" ]; then
    echo "✅ app.config.js found"
    echo "📄 app.config.js preview (first 20 lines):"
    head -n 20 app.config.js
else
    echo "❌ No Expo configuration file found (app.json or app.config.js)"
    echo "📂 Files in project root:"
    ls -la | grep -E "\.(json|js|ts)$"
fi

# Create iOS project using manual approach if Expo CLI methods fail
echo "🏗️ Attempting to generate iOS native project"

EXPO_SUCCESS=false

# Method 1: Try direct npx expo prebuild
echo "🔄 Method 1: Trying npx expo prebuild"
if command -v npx &> /dev/null; then
    echo "🎯 Running: npx expo prebuild --platform ios --clear --non-interactive"
    if npx expo prebuild --platform ios --clear --non-interactive --verbose; then
        echo "✅ npx expo prebuild completed successfully"
        EXPO_SUCCESS=true
    else
        echo "❌ npx expo prebuild failed"
        echo "📜 Last few lines of error output:"
        npx expo prebuild --platform ios --clear --non-interactive --verbose 2>&1 | tail -n 10 || echo "No additional error info"
    fi
else
    echo "❌ npx not available for Method 1"
fi

# Method 2: Try local expo executable
if [ "$EXPO_SUCCESS" = false ] && [ -f "node_modules/.bin/expo" ]; then
    echo "🔄 Method 2: Trying local expo executable"
    echo "🎯 Running: ./node_modules/.bin/expo prebuild --platform ios --clear --non-interactive"
    if ./node_modules/.bin/expo prebuild --platform ios --clear --non-interactive --verbose; then
        echo "✅ Local expo prebuild completed successfully"
        EXPO_SUCCESS=true
    else
        echo "❌ Local expo prebuild failed"
        echo "📜 Last few lines of error output:"
        ./node_modules/.bin/expo prebuild --platform ios --clear --non-interactive --verbose 2>&1 | tail -n 10 || echo "No additional error info"
    fi
else
    echo "❌ Local expo executable not available for Method 2"
fi

# Method 3: Try global expo if available
if [ "$EXPO_SUCCESS" = false ] && command -v expo &> /dev/null; then
    echo "🔄 Method 3: Trying global expo"
    echo "🎯 Running: expo prebuild --platform ios --clear --non-interactive"
    if expo prebuild --platform ios --clear --non-interactive --verbose; then
        echo "✅ Global expo prebuild completed successfully"
        EXPO_SUCCESS=true
    else
        echo "❌ Global expo prebuild failed"
        echo "📜 Last few lines of error output:"
        expo prebuild --platform ios --clear --non-interactive --verbose 2>&1 | tail -n 10 || echo "No additional error info"
    fi
else
    echo "❌ Global expo not available for Method 3"
fi

# Method 4: Enhanced manual iOS project creation with proper Expo integration
if [ "$EXPO_SUCCESS" = false ]; then
    echo "🔄 Method 4: Enhanced manual iOS project creation with Expo integration"
    
    # Check if we can skip prebuild by using existing iOS directory
    if [ -d "/Volumes/workspace/repository/ios" ] && [ -f "/Volumes/workspace/repository/ios/Podfile" ]; then
        echo "🎯 Found existing iOS directory with Podfile, skipping prebuild"
        EXPO_SUCCESS=true
    else
        echo "❌ No existing iOS directory found"
        
        # Create enhanced iOS structure manually with proper Expo integration
        echo "🔧 Creating enhanced iOS structure with proper Expo + React Native integration"
        mkdir -p ios
        cd ios
        
        # Get app name from package.json
        APP_NAME="callapp"
        if [ -f "$PROJECT_ROOT/package.json" ]; then
            APP_NAME=$(node -p "require('$PROJECT_ROOT/package.json').name.replace(/[^a-zA-Z0-9]/g, '')" 2>/dev/null || echo "callapp")
        fi
        echo "📱 Using app name: $APP_NAME"
        
        # Create an improved Podfile with proper Expo autolinking and React Native CLI integration
        cat > Podfile << EOF
# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

# Resolve expo autolinking with node
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "expo/scripts/autolinking.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

platform :ios, '13.0'
install! 'cocoapods', :deterministic_uuids => false

target '$APP_NAME' do
  # First, call use_expo_modules! to enable Expo modules
  use_expo_modules!
  
  # Then, configure React Native modules
  config = use_native_modules!

  # Configure React Native with proper options for current version
  use_react_native!(
    :path => config[:reactNativePath],
    # Hermes is enabled by default. Disable by setting this flag to false.
    # Upcoming versions of React Native may rely on get_default_flags(), but
    # we make it explicit here to aid in the React Native upgrade process.
    :hermes_enabled => true,
    :fabric_enabled => false,
    # Enables Flipper.
    # Note that if you have use_frameworks! enabled, Flipper will not work and
    # you should disable the next line.
    :flipper_configuration => FlipperConfiguration.enabled,
    # An absolute path to your application root.
    :app_path => "$PROJECT_ROOT"
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      # Set `mac_catalyst_enabled` to `true` in order to apply patches
      # necessary for Mac Catalyst builds
      :mac_catalyst_enabled => false
    )
    
    # https://github.com/expo/expo/blob/main/packages/expo-modules-core/ios/ExpoModulesCore.podspec
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'EX_DEV=\$(CONFIGURATION)'
        end
      end
    end
  end
end
EOF

        # Check if we need to use alternative Podfile without FlipperConfiguration
        if ! grep -q "FlipperConfiguration" "$PROJECT_ROOT/node_modules/react-native/scripts/react_native_pods.rb" 2>/dev/null; then
            echo "⚠️ FlipperConfiguration not available in this React Native version, using alternative Podfile"
            cat > Podfile << EOF
# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

# Resolve expo autolinking with node
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "expo/scripts/autolinking.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

platform :ios, '13.0'
install! 'cocoapods', :deterministic_uuids => false

target '$APP_NAME' do
  # First, call use_expo_modules! to enable Expo modules
  use_expo_modules!
  
  # Then, configure React Native modules
  config = use_native_modules!

  # Configure React Native with basic options (without flipper_configuration)
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
  end
end
EOF
        fi

        # Create basic iOS app structure
        mkdir -p "$APP_NAME"
        
        # Create Info.plist
        cat > "$APP_NAME/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>Call App</string>
  <key>CFBundleExecutable</key>
  <string>$APP_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>dev.asashin227.call-app</string>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>NSMicrophoneUsageDescription</key>
  <string>このアプリは通話機能にマイクを使用します。CallKitによる通話にはマイクのアクセス権が必要です。</string>
  <key>UIBackgroundModes</key>
  <array>
    <string>voip</string>
  </array>
  <key>UILaunchStoryboardName</key>
  <string>LaunchScreen</string>
  <key>UIRequiredDeviceCapabilities</key>
  <array>
    <string>armv7</string>
  </array>
  <key>UIStatusBarStyle</key>
  <string>UIStatusBarStyleDefault</string>
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
  <key>UISupportedInterfaceOrientations~ipad</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
  <key>UIViewControllerBasedStatusBarAppearance</key>
  <false/>
</dict>
</plist>
EOF
        
        # Create basic AppDelegate.swift
        cat > "$APP_NAME/AppDelegate.swift" << EOF
import UIKit
import React
import ExpoModulesCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

  var window: UIWindow?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let bridge = RCTBridge(delegate: self, launchOptions: launchOptions)!
    let rootView = RCTRootView(bridge: bridge, moduleName: "$APP_NAME", initialProperties: nil)

    if #available(iOS 13.0, *) {
        rootView.backgroundColor = UIColor.systemBackground
    } else {
        rootView.backgroundColor = UIColor.white
    }

    self.window = UIWindow(frame: UIScreen.main.bounds)
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()

    return true
  }
}

extension AppDelegate: RCTBridgeDelegate {
  func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
EOF
        
        if [ -f "Podfile" ]; then
            echo "✅ Enhanced Podfile created with proper Expo autolinking integration"
            echo "📄 Podfile preview:"
            head -n 25 Podfile
            EXPO_SUCCESS=true
        else
            echo "❌ Failed to create enhanced Podfile"
        fi
        
        cd "$PROJECT_ROOT"
    fi
fi

# Final check for prebuild success
if [ "$EXPO_SUCCESS" = false ]; then
    echo "❌ All iOS project generation methods failed"
    echo "🔍 Final diagnosis:"
    echo "  - npx available: $(command -v npx &> /dev/null && echo 'Yes' || echo 'No')"
    echo "  - Local expo: $([ -f 'node_modules/.bin/expo' ] && echo 'Yes' || echo 'No')"  
    echo "  - Global expo: $(command -v expo &> /dev/null && echo 'Yes' || echo 'No')"
    echo "  - app.json: $([ -f 'app.json' ] && echo 'Yes' || echo 'No')"
    echo "  - node_modules: $([ -d 'node_modules' ] && echo 'Yes' || echo 'No')"
    echo "  - React Native CLI: $([ -f 'node_modules/@react-native-community/cli/build/bin.js' ] && echo 'Yes' || echo 'No')"
    
    # Try one more time with maximum verbosity and error capture
    echo "🔄 Final attempt with maximum debugging:"
    echo "Environment:"
    env | grep -E "(NODE|npm|PATH)" | head -n 10
    echo "📂 Current directory contents:"
    ls -la | head -n 20
    
    if command -v npx &> /dev/null; then
        echo "🎯 Final npx attempt with full error capture:"
        npx expo prebuild --platform ios --clear --non-interactive --verbose 2>&1 || true
    fi
    
    exit 1
else
    echo "✅ iOS project generation completed successfully"
fi

# Verify iOS directory and Podfile were created
echo "🔍 Verifying iOS project generation"

if [ -d "$PROJECT_ROOT/ios" ]; then
    echo "✅ iOS directory successfully created at: $PROJECT_ROOT/ios"
    echo "📂 Contents of generated iOS directory:"
    ls -la "$PROJECT_ROOT/ios" | head -n 20
else
    echo "❌ iOS directory not found after prebuild"
    echo "📂 Contents of project root after prebuild:"
    ls -la "$PROJECT_ROOT" | head -n 20
    exit 1
fi

# Navigate to ios directory for CocoaPods
echo "🍫 Installing CocoaPods dependencies"

IOS_DIR="$PROJECT_ROOT/ios"
echo "🎯 Using iOS directory: $IOS_DIR"
cd "$IOS_DIR"

# Verify we're in the ios directory and Podfile exists
if [ -f "Podfile" ]; then
    echo "✅ Found Podfile in: $(pwd)"
    echo "📄 Podfile preview (first 20 lines):"
    head -n 20 Podfile
    
    # Verify CocoaPods is available
    if command -v pod &> /dev/null; then
        echo "✅ CocoaPods found: $(pod --version)"
    else
        echo "📦 Installing CocoaPods"
        sudo gem install cocoapods --no-document
    fi
    
    # Clean previous installations
    echo "🧹 Cleaning previous CocoaPods installations"
    rm -rf Pods/ Podfile.lock 2>/dev/null || true
    
    # Set Node path for CocoaPods
    echo "🔧 Configuring Node path for CocoaPods"
    export NODE_BINARY=$(which node)
    echo "📍 NODE_BINARY set to: $NODE_BINARY"
    
    # Verify Expo autolinking script is available
    echo "🔍 Verifying Expo autolinking availability"
    if [ -f "$PROJECT_ROOT/node_modules/expo/scripts/autolinking.rb" ]; then
        echo "✅ Expo autolinking script found"
    else
        echo "⚠️ Expo autolinking script not found, this may cause issues"
        ls -la "$PROJECT_ROOT/node_modules/expo/scripts/" 2>/dev/null || echo "Expo scripts directory not found"
    fi
    
    # Install pods with verbose output
    echo "📦 Running pod install with verbose output"
    if pod install --repo-update --verbose; then
        echo "✅ CocoaPods installation completed successfully"
    else
        echo "⚠️ Initial pod install failed, trying with additional fixes"
        
        # Try to fix common issues
        echo "🔧 Applying pod install fixes"
        
        # Clear CocoaPods cache
        pod cache clean --all 2>/dev/null || true
        
        # Update pod repo
        pod repo update 2>/dev/null || true
        
        # Try again with more aggressive options
        if pod install --repo-update --verbose --deployment; then
            echo "✅ CocoaPods installation completed with fixes"
        else
            echo "❌ CocoaPods installation failed even with fixes"
            echo "📜 Podfile content for debugging:"
            cat Podfile
            echo "📦 Available node_modules packages (React Native related):"
            ls -la "$PROJECT_ROOT/node_modules" | grep -E "(react|expo)" | head -n 15
            echo "📦 Expo modules in node_modules:"
            ls -la "$PROJECT_ROOT/node_modules" | grep expo | head -n 10
            exit 1
        fi
    fi
    
    # Verify Pods directory was created
    if [ -d "Pods" ]; then
        echo "✅ Pods directory successfully created"
        echo "📊 Pods installation summary:"
        ls -la Pods/ | head -n 15
        
        # Check for specific pods
        echo "📋 Installed pods check:"
        ls -1 Pods/ | grep -E "(Expo|RNCallKeep)" | head -n 10 || echo "No specific pods found"
    else
        echo "❌ Pods directory not found after pod install"
        exit 1
    fi
    
else
    echo "❌ Podfile not found in $(pwd)"
    echo "📂 Contents of iOS directory:"
    ls -la | head -n 20
    echo "📂 Searching for Podfile in project:"
    find "$PROJECT_ROOT" -name "Podfile" -type f 2>/dev/null || echo "No Podfile found in project"
    exit 1
fi

# Final verification
echo "🔍 Final project structure verification"
echo "📊 Project structure summary:"
echo "  - Project Root: $PROJECT_ROOT"
echo "  - iOS Directory: $IOS_DIR"
echo "  - Podfile exists: $([ -f "$IOS_DIR/Podfile" ] && echo '✅ Yes' || echo '❌ No')"
echo "  - Pods directory exists: $([ -d "$IOS_DIR/Pods" ] && echo '✅ Yes' || echo '❌ No')"
echo "  - Xcode project exists: $(find "$IOS_DIR" -name "*.xcodeproj" -type d | head -n 1 | xargs test -d && echo '✅ Yes' || echo '❌ No')"
echo "  - Xcode workspace exists: $(find "$IOS_DIR" -name "*.xcworkspace" -type d | head -n 1 | xargs test -d && echo '✅ Yes' || echo '❌ No')"
echo "  - React Native CLI available: $([ -f "$PROJECT_ROOT/node_modules/@react-native-community/cli/build/bin.js" ] && echo '✅ Yes' || echo '❌ No')"
echo "  - Expo autolinking script: $([ -f "$PROJECT_ROOT/node_modules/expo/scripts/autolinking.rb" ] && echo '✅ Yes' || echo '❌ No')"

echo "🎉 Post-clone script completed successfully"
echo "📍 Final working directory: $(pwd)"
echo "📊 Environment summary:"
echo "  - System: $(uname -a)"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - Expo CLI: $(npx expo --version 2>/dev/null || echo 'Not available')"
echo "  - CocoaPods: $(pod --version 2>/dev/null || echo 'Not available')"
echo "  - Project Root: $PROJECT_ROOT"
echo "  - iOS Directory: $IOS_DIR"
echo "  - NODE_BINARY: $NODE_BINARY"
echo "  - PATH (first 200 chars): ${PATH:0:200}..."