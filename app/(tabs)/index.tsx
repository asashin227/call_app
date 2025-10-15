import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput } from 'react-native';

export default function HomeScreen() {
  const [description, setDescription] = useState('');
  const textInputRef = useRef<TextInput>(null);


  const handleCall = async () => {
    if (!description.trim()) {
      Alert.alert('エラー', 'ユーザー名またはアカウント名を入力してください');
      return;
    }

    try {
      // 手動シグナリング画面に遷移
      console.log('🔧 Opening manual signaling mode...');
      router.push('/manual-signaling');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('エラー', `通話の開始に失敗しました: ${errorMessage}`);
      console.error('Call error:', error);
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


        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infoTitle}>💡 使用方法</ThemedText>
          <ThemedText style={styles.infoText}>
            1. 通話相手の名前を入力{'\n'}
            2. 右上の「Call」ボタンを押す{'\n'}
            3. 手動シグナリング画面に遷移{'\n'}
            4. QRコードまたはテキストで接続情報を交換{'\n'}
            5. ICE候補を交換して接続を確立{'\n'}
            6. 通話開始{'\n'}
            {'\n'}
            • **手動シグナリング**: サーバー不要のP2P通話{'\n'}
            • **QRコード対応**: 簡単に接続情報を共有{'\n'}
            • **音声通話**: リアルタイム音声通話
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.featuresContainer}>
          <ThemedText style={styles.featuresTitle}>🚀 WebRTC手動シグナリング機能</ThemedText>
          <ThemedText style={styles.featuresText}>
            • **P2P通話**: サーバー不要の直接通話{'\n'}
            • **手動シグナリング**: QRコード・テキストで接続情報を交換{'\n'}
            • **CallKit統合**: iOSネイティブ通話UI{'\n'}
            • **通話制御**: ミュート・スピーカー切り替え{'\n'}
            • **権限管理**: マイク権限自動要求{'\n'}
            • **クロスプラットフォーム**: iOS・Android対応
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.warningContainer}>
          <ThemedText style={styles.warningText}>
            🎥 WebRTC手動シグナリングにより、サーバーなしで実際の音声通話が可能です。
          </ThemedText>
        </ThemedView>
        </ThemedView>
      </ScrollView>
      </ThemedView>
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
});
