import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IncomingCallScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const phoneInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

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

  // 着信通話をシミュレートする関数
  const simulateIncomingCall = async () => {
    if (!phoneNumber.trim() || !displayName.trim()) {
      Alert.alert('エラー', '電話番号と表示名を両方入力してください');
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

      console.log('📞 CallKit: Simulating incoming call');
      console.log('- UUID:', uuid);
      console.log('- Phone Number:', callerPhoneNumber);
      console.log('- Display Name:', callerDisplayName);
      console.log('- Platform:', Platform.OS);
      console.log('- Environment:', isSimulator() ? 'Simulator' : 'Device');

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
              console.log('📊 Incoming Call Debug Information:');
              console.log('- UUID:', uuid);
              console.log('- Phone Number:', callerPhoneNumber);
              console.log('- Display Name:', callerDisplayName);
              console.log('- Handle Type: generic');
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
      console.error('❌ CallKit: Failed to simulate incoming call:', errorMessage);
      console.error('- Full Error Object:', error);
      
      Alert.alert(
        '⚠️ CallKitエラー', 
        `着信通話のシミュレートに失敗しました\n\n詳細: ${errorMessage}\n\nプラットフォーム: ${Platform.OS}\n環境: ${isSimulator() ? 'シミュレーター' : '実機'}`,
        [
          { text: 'OK' },
          { 
            text: 'デバッグ情報', 
            onPress: async () => {
              console.log('🐛 Incoming Call Error Debug Info:');
              console.log('- Error:', error);
              console.log('- Phone Number Input:', phoneNumber);
              console.log('- Display Name Input:', displayName);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '受信',
          headerRight: () => (
            <ThemedText
              style={styles.simulateButton}
              onPress={simulateIncomingCall}
            >
              Simulate
            </ThemedText>
          ),
        }}
      />
      
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
            returnKeyType="done"
            onSubmitEditing={() => {
              if (nameInputRef.current) {
                nameInputRef.current.blur();
              }
            }}
            ref={nameInputRef}
          />
        </ThemedView>

        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infoTitle}>💡 使用方法</ThemedText>
          <ThemedText style={styles.infoText}>
            1. 電話番号と表示名を入力{'\n'}
            2. 右上の「Simulate」ボタンを押す{'\n'}
            3. CallKitの着信画面が表示される{'\n'}
            4. 通話に応答または拒否する
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.warningContainer}>
          <ThemedText style={styles.warningText}>
            ⚠️ 実際の着信ではありません。CallKitの動作確認用のシミュレート機能です。
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
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
