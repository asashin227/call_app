import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput } from 'react-native';
import RNCallKeep from 'react-native-callkeep';

export default function IncomingCallScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('5');
  const [isWaiting, setIsWaiting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const phoneInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const delayInputRef = useRef<TextInput>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<number | null>(null);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      // タイマーをクリーンアップ
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  // シミュレーターかどうかを正確に判定する関数
  const isSimulator = (): boolean => {
    if (Platform.OS === 'ios') {
      return !Constants.isDevice;
    } else if (Platform.OS === 'android') {
      return !Constants.isDevice;
    }
    return false;
  };

  // RFC 4122準拠のUUID v4を生成する関数
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // マイク権限を要求する関数
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log('📋 Requesting microphone permission...');
      
      const currentStatus = await Audio.getPermissionsAsync();
      console.log('📋 Current microphone permission status:', currentStatus.status);
      
      if (currentStatus.status === 'granted') {
        console.log('✅ Microphone permission already granted');
        return true;
      }
      
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
                Alert.alert(
                  '権限設定の手順',
                  Platform.OS === 'ios' 
                    ? '設定アプリ > プライバシーとセキュリティ > マイク > Call App をオンにしてください'
                    : '設定 > アプリ > Call App > 権限 > マイク をオンにしてください',
                  [{ text: 'OK' }]
                );
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

  // カウントダウンをキャンセルする関数
  const cancelIncomingCall = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
    setIsWaiting(false);
    setCountdown(0);
    console.log('📞 CallKit: Incoming call simulation cancelled');
  };

  // 遅延後に着信を実行する内部関数
  const executeIncomingCall = async (uuid: string, callerPhoneNumber: string, callerDisplayName: string) => {
    try {
      console.log('📞 CallKit: Executing delayed incoming call');
      console.log('- UUID:', uuid);
      console.log('- Phone Number:', callerPhoneNumber);
      console.log('- Display Name:', callerDisplayName);

      // CallKitで着信通話を表示
      RNCallKeep.displayIncomingCall(
        uuid,
        callerPhoneNumber, // handle
        callerDisplayName, // localizedCallerName  
        'generic', // handleType
        false // hasVideo
      );

      console.log('✅ CallKit: displayIncomingCall executed successfully');
      
      // 成功メッセージ
      Alert.alert(
        '着信通話シミュレート', 
        `${callerDisplayName}からの着信をシミュレートしました\n\n電話番号: ${callerPhoneNumber}\nUUID: ${uuid.slice(0, 8)}...\n\n${isSimulator() ? '※ シミュレーター環境' : '※ 実機環境'}`,
        [
          { text: 'OK' },
          {
            text: 'デバッグ情報',
            onPress: async () => {
              console.log('📊 Delayed Incoming Call Debug Information:');
              console.log('- UUID:', uuid);
              console.log('- Phone Number:', callerPhoneNumber);
              console.log('- Display Name:', callerDisplayName);
              console.log('- Handle Type: generic');
              console.log('- Delay:', delaySeconds, 'seconds');
              console.log('- Platform:', Platform.OS);
              console.log('- Is Simulator:', isSimulator());
              console.log('- Constants.isDevice:', Constants.isDevice);
              
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

      // 入力欄をクリア
      setPhoneNumber('');
      setDisplayName('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ CallKit: Failed to execute delayed incoming call:', errorMessage);
      console.error('- Full Error Object:', error);
      
      Alert.alert(
        '⚠️ CallKitエラー', 
        `着信通話のシミュレートに失敗しました\n\n詳細: ${errorMessage}\n\nプラットフォーム: ${Platform.OS}\n環境: ${isSimulator() ? 'シミュレーター' : '実機'}`,
        [
          { text: 'OK' },
          { 
            text: 'デバッグ情報', 
            onPress: async () => {
              console.log('🐛 Delayed Incoming Call Error Debug Info:');
              console.log('- Error:', error);
              console.log('- Phone Number Input:', phoneNumber);
              console.log('- Display Name Input:', displayName);
              console.log('- Delay Input:', delaySeconds);
              console.log('- Platform:', Platform.OS);
              console.log('- Is Simulator:', isSimulator());
              
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
    } finally {
      setIsWaiting(false);
      setCountdown(0);
    }
  };

  // 着信通話をシミュレートする関数
  const simulateIncomingCall = async () => {
    if (!phoneNumber.trim() || !displayName.trim()) {
      Alert.alert('エラー', '電話番号と表示名を両方入力してください');
      return;
    }

    // 遅延時間の検証
    const delay = parseInt(delaySeconds, 10);
    if (isNaN(delay) || delay < 0 || delay > 300) { // 0-300秒の範囲
      Alert.alert('エラー', '遅延時間は0〜300秒の数値で入力してください');
      return;
    }

    try {
      // マイク権限を確認・要求
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        console.log('❌ CallKit: Microphone permission not granted, aborting incoming call');
        return;
      }

      const uuid = generateUUID();
      const callerPhoneNumber = phoneNumber.trim();
      const callerDisplayName = displayName.trim();

      console.log('📞 CallKit: Starting delayed incoming call simulation');
      console.log('- UUID:', uuid);
      console.log('- Phone Number:', callerPhoneNumber);
      console.log('- Display Name:', callerDisplayName);
      console.log('- Delay:', delay, 'seconds');
      console.log('- Platform:', Platform.OS);
      console.log('- Environment:', isSimulator() ? 'Simulator' : 'Device');

      // 即座に着信する場合
      if (delay === 0) {
        await executeIncomingCall(uuid, callerPhoneNumber, callerDisplayName);
        return;
      }

      // 遅延がある場合はカウントダウン開始
      setIsWaiting(true);
      setCountdown(delay);

      console.log(`⏰ CallKit: Starting ${delay} second countdown`);

      // カウントダウンタイマー開始
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const newCount = prev - 1;
          console.log(`⏰ Countdown: ${newCount} seconds remaining`);
          return newCount;
        });
      }, 1000) as unknown as number;

      // 指定時間後に着信実行
      delayTimeoutRef.current = setTimeout(async () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        await executeIncomingCall(uuid, callerPhoneNumber, callerDisplayName);
      }, delay * 1000) as unknown as number;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ CallKit: Failed to start incoming call simulation:', errorMessage);
      console.error('- Full Error Object:', error);
      
      // 待機状態をリセット
      setIsWaiting(false);
      setCountdown(0);
      
      Alert.alert(
        '⚠️ CallKitエラー', 
        `着信通話のシミュレート開始に失敗しました\n\n詳細: ${errorMessage}\n\nプラットフォーム: ${Platform.OS}\n環境: ${isSimulator() ? 'シミュレーター' : '実機'}`,
        [
          { text: 'OK' },
          { 
            text: 'デバッグ情報', 
            onPress: async () => {
              console.log('🐛 Incoming Call Start Error Debug Info:');
              console.log('- Error:', error);
              console.log('- Phone Number Input:', phoneNumber);
              console.log('- Display Name Input:', displayName);
              console.log('- Delay Input:', delaySeconds);
              console.log('- Parsed Delay:', delay);
              console.log('- Platform:', Platform.OS);
              console.log('- Is Simulator:', isSimulator());
              
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
          title: '受信',
          headerRight: () => (
            <ThemedText
              style={[
                styles.simulateButton, 
                isWaiting && styles.cancelButton
              ]}
              onPress={isWaiting ? cancelIncomingCall : simulateIncomingCall}
            >
              {isWaiting ? 'Cancel' : 'Simulate'}
            </ThemedText>
          ),
        }}
      />
      
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
        <ThemedText style={styles.description}>
          着信通話をシミュレートします
        </ThemedText>
        
        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>電話番号</ThemedText>
          <TextInput
            style={styles.textInput}
            placeholder="090-1234-5678"
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            returnKeyType="next"
            keyboardType="phone-pad"
            onSubmitEditing={() => {
              if (nameInputRef.current) {
                nameInputRef.current.focus();
              }
            }}
            ref={phoneInputRef}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>表示名</ThemedText>
          <TextInput
            style={styles.textInput}
            placeholder="田中 太郎"
            placeholderTextColor="#999"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
            onSubmitEditing={() => {
              if (delayInputRef.current) {
                delayInputRef.current.focus();
              }
            }}
            ref={nameInputRef}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>遅延時間（秒）</ThemedText>
          <TextInput
            style={styles.textInput}
            placeholder="5"
            placeholderTextColor="#999"
            value={delaySeconds}
            onChangeText={setDelaySeconds}
            returnKeyType="done"
            keyboardType="numeric"
            onSubmitEditing={() => {
              if (delayInputRef.current) {
                delayInputRef.current.blur();
              }
            }}
            ref={delayInputRef}
          />
        </ThemedView>

        {/* カウントダウン表示 */}
        {isWaiting && (
          <ThemedView style={styles.countdownContainer}>
            <ThemedText style={styles.countdownTitle}>
              📞 着信まで
            </ThemedText>
            <ThemedText style={styles.countdownNumber}>
              {countdown}
            </ThemedText>
            <ThemedText style={styles.countdownUnit}>
              秒
            </ThemedText>
            <ThemedText style={styles.countdownMessage}>
              {displayName} からの着信を準備中...
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infoTitle}>💡 使用方法</ThemedText>
          <ThemedText style={styles.infoText}>
            1. 電話番号と表示名を入力{'\n'}
            2. 遅延時間（0〜300秒）を設定{'\n'}
            3. 右上の「Simulate」ボタンを押す{'\n'}
            4. カウントダウン後にCallKit着信画面が表示{'\n'}
            5. 通話に応答または拒否する{'\n'}
            {'\n'}
            • 0秒設定で即座に着信{'\n'}
            • カウントダウン中は「Cancel」で中止可能
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.warningContainer}>
          <ThemedText style={styles.warningText}>
            ⚠️ 実際の着信ではありません。CallKitの動作確認用のシミュレート機能です。
          </ThemedText>
        </ThemedView>
      </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
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
  simulateButton: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelButton: {
    color: '#FF3B30',
  },
  countdownContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 24,
    marginVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  countdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 8,
  },
  countdownUnit: {
    fontSize: 16,
    color: '#2E7D32',
    marginBottom: 12,
  },
  countdownMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
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
});
