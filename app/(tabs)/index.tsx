import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import WebRTCCallModal from '@/components/WebRTCCallModal';
import { audioService } from '@/services/AudioService';
import { signalingService } from '@/services/SignalingService';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';
import RNCallKeep from 'react-native-callkeep';

export default function HomeScreen() {
  const [description, setDescription] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const [enableWebRTC, setEnableWebRTC] = useState(true); // WebRTC機能を有効化
  const [enableVideo, setEnableVideo] = useState(false);
  const [showWebRTCModal, setShowWebRTCModal] = useState(false);
  const [manualSignaling, setManualSignaling] = useState(false); // 手動シグナリングモード

  // シミュレーターかどうかを正確に判定する関数
  const isSimulator = (): boolean => {
    if (Platform.OS === 'ios') {
      // Expo Constants を使用してデバイス情報を取得
      return !Constants.isDevice;
    } else if (Platform.OS === 'android') {
      // Androidの場合も同様にConstants.isDeviceを使用
      return !Constants.isDevice;
    }
    return false;
  };

  // WebRTC用の権限を要求する関数（カメラ・マイク）
  const requestWebRTCPermissions = async (needsVideo: boolean = false): Promise<boolean> => {
    try {
      console.log('📋 Requesting WebRTC permissions... Video:', needsVideo);
      
      // マイク権限を要求
      const micPermission = await Audio.requestPermissionsAsync();
      console.log('📋 Microphone permission result:', micPermission.status);
      
      if (micPermission.status !== 'granted') {
        Alert.alert(
          'マイク権限が必要です',
          'WebRTC通話機能を使用するにはマイクのアクセス権限が必要です。',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // ビデオ通話の場合はカメラ権限も要求
      if (needsVideo) {
        // TODO: カメラ権限の実装
        console.log('📋 Camera permission would be requested here for video calls');
      }
      
      console.log('✅ WebRTC permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting WebRTC permissions:', error);
      Alert.alert('エラー', '権限の取得中にエラーが発生しました。');
      return false;
    }
  };

  // マイク権限を要求する関数（既存のCallKeep用）
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log('📋 Requesting microphone permission...');
      
      // 現在の権限ステータスを確認
      const currentStatus = await Audio.getPermissionsAsync();
      console.log('📋 Current microphone permission status:', currentStatus.status);
      
      if (currentStatus.status === 'granted') {
        console.log('✅ Microphone permission already granted');
        return true;
      }
      
      // 権限を要求
      const permissionResult = await Audio.requestPermissionsAsync();
      console.log('📋 Permission request result:', permissionResult.status);
      
      if (permissionResult.status === 'granted') {
        console.log('✅ Microphone permission granted');
        return true;
      } else {
        console.log('❌ Microphone permission denied');
        Alert.alert(
          'マイク権限が必要です',
          'CallKitを使用するにはマイクのアクセス権限が必要です。\n設定からマイクの権限を有効にしてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: '設定を開く', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // iOSの設定を開く方法の案内
                  Alert.alert(
                    '権限設定の手順',
                    '設定アプリ > プライバシーとセキュリティ > マイク > Call App をオンにしてください',
                    [{ text: 'OK' }]
                  );
                } else {
                  // Androidの設定案内
                  Alert.alert(
                    '権限設定の手順',
                    '設定 > アプリ > Call App > 権限 > マイク をオンにしてください',
                    [{ text: 'OK' }]
                  );
                }
              }
            }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting microphone permission:', error);
      Alert.alert(
        'エラー',
        'マイク権限の取得中にエラーが発生しました。',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // RFC 4122準拠のUUID v4を生成する関数
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      // 'x' の場合: 0-15のランダムな値
      // 'y' の場合: 8-11 (binary: 10xx) の範囲でバリアント部分を生成
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleCall = async () => {
    if (!description.trim()) {
      Alert.alert('エラー', 'ユーザー名またはアカウント名を入力してください');
      return;
    }

    try {
      if (manualSignaling) {
        // 手動シグナリング画面に遷移
        console.log('🔧 Opening manual signaling mode...');
        router.push('/manual-signaling');
        return;
      }
      
      if (enableWebRTC) {
        // WebRTC通話を開始
        console.log('🎥 Starting WebRTC call...');
        await startWebRTCCall();
      } else {
        // 従来のCallKeep通話を開始
        console.log('📞 Starting CallKeep call...');
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          console.log('❌ CallKit: Microphone permission not granted, aborting call');
          return;
        }
        console.log('✅ CallKit: Microphone permission granted, proceeding with call');
        startCallWithWarning();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('エラー', `通話の開始に失敗しました: ${errorMessage}`);
      console.error('Call error:', error);
    }
  };

  // WebRTC通話を開始する関数
  const startWebRTCCall = async () => {
    try {
      // WebRTC権限を確認・要求
      const hasPermissions = await requestWebRTCPermissions(enableVideo);
      if (!hasPermissions) {
        console.log('❌ WebRTC: Permissions not granted, aborting call');
        return;
      }

      console.log('🎥 WebRTC: Starting call to:', description.trim(), 'with video:', enableVideo);
      
      // シグナリングサービスを初期化
      if (!signalingService.isConnectedToSignaling()) {
        await signalingService.connect({
          id: 'local_user',
          name: 'あなた',
          status: 'online',
        });
      }

      // WebRTC通話を開始
      const callId = await signalingService.initiateCall(description.trim(), enableVideo);
      
      // WebRTCモーダルを表示
      setShowWebRTCModal(true);

      console.log('✅ WebRTC: Call initiated successfully with ID:', callId);

    } catch (error) {
      console.error('❌ WebRTC: Failed to start call:', error);
      throw error;
    }
  };

  const startCallWithWarning = async () => {
    try {
      // RFC 4122準拠のUUID v4を生成
      const uuid = generateUUID();
      
      // 入力されたテキストをそのまま使用（アカウント名・ユーザー名として）
      const accountName = description.trim();
      const displayName = description.trim();
      
      console.log('📱 CallKit: Initiating outgoing call');
      console.log('- UUID:', uuid);
      console.log('- Account name:', accountName);
      console.log('- Display name:', displayName);
      console.log('- UUID format verification:', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid));
      console.log('- Platform:', Platform.OS);
      console.log('- Is Dev Mode:', __DEV__);
      console.log('- Is Simulator:', isSimulator());
      console.log('- Constants.isDevice:', Constants.isDevice);
      
      // CallKitの権限を確認とリクエスト（iOS）
      if (Platform.OS === 'ios') {
        try {
          // CallKit権限をチェック
          const hasPermissions = await RNCallKeep.checkIfBusy();
          console.log('📋 CallKit: checkIfBusy result -', hasPermissions);
          
          // マイク権限の現在のステータスを再確認
          const micPermission = await Audio.getPermissionsAsync();
          console.log('📋 CallKit: microphone permission status -', micPermission.status);
          
          // スピーカー設定をチェック
          const speakerStatus = await RNCallKeep.checkSpeaker();
          console.log('📋 CallKit: speaker status -', speakerStatus);
          
          // 権限が不足している場合の警告（ログのみ）
          if (!hasPermissions) {
            console.log('⚠️ CallKit: Insufficient CallKit permissions, but continuing...');
          }
          
          if (micPermission.status !== 'granted') {
            console.log('⚠️ CallKit: Microphone permission not granted -', micPermission.status);
          }
        } catch (permissionError) {
          console.warn('⚠️ CallKit: Permission check failed -', permissionError);
        }
      }
      
      // 発信音を開始
      console.log('🎵 CallKit: Starting outgoing call audio');
      await audioService.handleCallStateChange('outgoing');
      
      // CallKitで通話を開始（汎用タイプを使用）
      console.log('🚀 CallKit: Calling RNCallKeep.startCall...');
      // パラメーターの詳細ログ
      console.log('- startCall parameters:');
      console.log('  * uuid:', uuid);
      console.log('  * handle:', accountName);
      console.log('  * contactIdentifier:', displayName);
      console.log('  * handleType:', 'generic');
      console.log('  * hasVideo:', false);
      
      // アカウント名をそのまま使用（日本語やユーザー名に対応）
      RNCallKeep.startCall(uuid, accountName, displayName, 'generic', false);
      console.log('✅ CallKit: RNCallKeep.startCall completed');

      // 少し待ってから結果を報告
      setTimeout(() => {
        Alert.alert(
          '通話開始', 
          `${displayName}\n(${accountName})\nへの通話を開始しました\n\nUUID: ${uuid.slice(0, 8)}...\n\n${isSimulator() ? '※ シミュレーター環境' : '※ 実機環境'}`,
          [
            { text: 'OK' },
            {
              text: 'デバッグ情報',
              onPress: async () => {
                console.log('📊 CallKit Debug Information:');
                console.log('- Is Simulator:', isSimulator());
                console.log('- Constants.isDevice:', Constants.isDevice);
                console.log('- Original Input:', description);
                console.log('- Account Name:', accountName);
                console.log('- Display Name:', displayName);
                console.log('- UUID:', uuid);
                console.log('- Platform:', Platform.OS);
                console.log('- Dev Mode:', __DEV__);
                console.log('- Handle Type: generic');
                
                // マイク権限の現在の状況を確認
                try {
                  const micPermission = await Audio.getPermissionsAsync();
                  console.log('- Microphone Permission:', micPermission.status);
                } catch (error) {
                  console.log('- Microphone Permission Check Error:', error);
                }
              }
            }
          ]
        );
      }, 100);
      
      // 入力欄はクリアしない（再利用のため保持）
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('💥 CallKit startCall error details:', {
        error,
        message: errorMessage,
        description,
        platform: Platform.OS,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      Alert.alert(
        '⚠️ CallKitエラー', 
        `通話開始に失敗しました\n\n詳細: ${errorMessage}\n\nプラットフォーム: ${Platform.OS}\n環境: ${isSimulator() ? 'シミュレーター' : '実機'}`,
        [
          { text: 'OK' },
          { 
            text: 'デバッグ情報', 
            onPress: async () => {
              console.log('🐛 CallKit Debug Info:');
              console.log('- Error:', error);
              console.log('- Is Simulator:', isSimulator());
              console.log('- Constants.isDevice:', Constants.isDevice);
              console.log('- Original Input:', description);
              console.log('- Account Name:', description.trim());
              console.log('- Platform:', Platform.OS);
              console.log('- Handle Type: generic');
              
              // マイク権限の現在の状況を確認
              try {
                const micPermission = await Audio.getPermissionsAsync();
                console.log('- Microphone Permission:', micPermission.status);
              } catch (permError) {
                console.log('- Microphone Permission Check Error:', permError);
              }
            }
          }
        ]
      );
    }
  };


  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '発信',
          headerRight: () => (
            <ThemedText
              style={styles.callButton}
              onPress={handleCall}
            >
              Call
            </ThemedText>
          ),
        }}
      />
      
      <ThemedView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <ThemedView style={styles.content}>
          <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>通話先</ThemedText>
          <TextInput
            style={styles.textInput}
            placeholder="ユーザー名またはアカウント名"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            returnKeyType="done"
            onSubmitEditing={() => {
              // キーボードを閉じる
              if (textInputRef.current) {
                textInputRef.current.blur();
              }
            }}
            ref={textInputRef}
          />
        </ThemedView>

        {/* WebRTC設定 */}
        <ThemedView style={styles.webrtcContainer}>
          <ThemedText style={styles.webrtcTitle}>🎥 WebRTC設定</ThemedText>
          
          <ThemedView style={styles.settingRow}>
            <ThemedText style={styles.settingLabel}>手動シグナリング（サーバー不要）</ThemedText>
            <Switch
              value={manualSignaling}
              onValueChange={(value) => {
                setManualSignaling(value);
                if (value) {
                  setEnableWebRTC(true); // 手動モードはWebRTCを使用
                }
              }}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={manualSignaling ? '#FF9500' : '#f4f3f4'}
            />
          </ThemedView>
          
          {!manualSignaling && (
            <>
              <ThemedView style={styles.settingRow}>
                <ThemedText style={styles.settingLabel}>WebRTC通話を使用</ThemedText>
                <Switch
                  value={enableWebRTC}
                  onValueChange={setEnableWebRTC}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={enableWebRTC ? '#007AFF' : '#f4f3f4'}
                />
              </ThemedView>

              {enableWebRTC && (
                <ThemedView style={styles.settingRow}>
                  <ThemedText style={styles.settingLabel}>ビデオ通話</ThemedText>
                  <Switch
                    value={enableVideo}
                    onValueChange={setEnableVideo}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={enableVideo ? '#007AFF' : '#f4f3f4'}
                  />
                </ThemedView>
              )}
            </>
          )}
        </ThemedView>

        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infoTitle}>💡 使用方法</ThemedText>
          <ThemedText style={styles.infoText}>
            1. ユーザー名またはアカウント名を入力{'\n'}
            2. WebRTC設定を選択（WebRTC/CallKeep）{'\n'}
            3. 右上の「Call」ボタンを押す{'\n'}
            4. 権限の許可（初回のみ）{'\n'}
            5. {enableWebRTC ? 'WebRTC通話画面' : 'CallKitの発信画面'}が表示される{'\n'}
            6. 通話開始・終了・保留などが可能{'\n'}
            {'\n'}
            • {enableWebRTC ? 'P2P実通話機能' : '汎用タイプ（generic）での発信'}{'\n'}
            • 日本語・英数字どちらでも対応{'\n'}
            • {enableWebRTC && enableVideo ? 'ビデオ通話対応' : '音声通話'}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.featuresContainer}>
          <ThemedText style={styles.featuresTitle}>🚀 {enableWebRTC ? 'WebRTC' : 'CallKeep'}機能</ThemedText>
          <ThemedText style={styles.featuresText}>
            {enableWebRTC ? (
              <>
                • **P2P通話**: 実際の音声・ビデオ通話{'\n'}
                • **WebRTC統合**: 最新のWeb技術で通話{'\n'}
                • **ビデオ通話**: カメラを使った映像通話{'\n'}
                • **通話制御**: ミュート・スピーカー切り替え{'\n'}
                • **権限管理**: カメラ・マイク権限自動要求{'\n'}
                • **クロスプラットフォーム**: iOS・Android対応
              </>
            ) : (
              <>
                • **アカウント名発信**: 電話番号以外での通話{'\n'}
                • **CallKit統合**: ネイティブ通話UI{'\n'}
                • **権限管理**: 自動マイク権限要求{'\n'}
                • **デバッグ情報**: 詳細ログ出力{'\n'}
                • **環境対応**: シミュレーター・実機両対応
              </>
            )}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.warningContainer}>
          <ThemedText style={styles.warningText}>
            {enableWebRTC ? (
              '🎥 WebRTC機能により実際の音声・ビデオ通話が可能です。デモ環境では自動応答されます。'
            ) : (
              '⚠️ CallKeep機能はUIのみで実際の通話ではありません。動作確認用のテスト機能です。'
            )}
          </ThemedText>
        </ThemedView>
        </ThemedView>
      </ScrollView>
      </ThemedView>
      
      {/* WebRTC通話モーダル */}
      {!manualSignaling && (
        <WebRTCCallModal
          visible={showWebRTCModal}
          onClose={() => setShowWebRTCModal(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 48,
    backgroundColor: '#fff',
  },
  callButton: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0066cc',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  featuresContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  featuresText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6c757d',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  webrtcContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  webrtcTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2e7d32',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
