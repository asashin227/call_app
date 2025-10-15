import CallScreen from '@/components/CallScreen';
import { useManualSignaling } from '@/contexts/ManualSignalingContext';
import { Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CallerStep3() {
  const {
    connectionInfo,
    setConnectionInfo,
    iceCandidateInput,
    setIceCandidateInput,
    currentCall,
  } = useManualSignaling();
  const [isConnected, setIsConnected] = useState(false);

  // 通話接続状態を監視
  useFocusEffect(
    useCallback(() => {
      const pc = (require('@/services/WebRTCService').webRTCService as any).peerConnection;
      if (pc) {
        const checkConnection = () => {
          if (pc.connectionState === 'connected') {
            setIsConnected(true);
            router.push('/manual-signaling/call');
          }
        };
        
        pc.addEventListener('connectionstatechange', checkConnection);
        
        return () => {
          pc.removeEventListener('connectionstatechange', checkConnection);
        };
      }
    }, [])
  );

  const addIceCandidate = async () => {
    try {
      if (!iceCandidateInput.trim()) {
        Alert.alert('エラー', 'ICE候補を入力してください');
        return;
      }
      
      console.log('🧊 Adding ICE candidate...');
      const candidate = JSON.parse(iceCandidateInput);
      
      const pc = (require('@/services/WebRTCService').webRTCService as any).peerConnection;
      if (pc) {
        await pc.addIceCandidate(candidate);
        setConnectionInfo(prev => ({
          ...prev,
          remoteIceCandidates: [...prev.remoteIceCandidates, candidate],
        }));
        setIceCandidateInput('');
        
        Alert.alert(
          '✅ ICE候補追加完了',
          `追加されたICE候補: ${connectionInfo.remoteIceCandidates.length + 1}個\n\n接続が確立されるまで、相手から届いたICE候補を順次追加してください。`
        );
      }
      
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
      Alert.alert('エラー', 'ICE候補の追加に失敗しました: ' + (error as Error).message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('コピー完了', `${label}をクリップボードにコピーしました`);
  };

  // 通話中の場合はCallScreenを表示
  if (isConnected && currentCall) {
    return (
      <CallScreen
        callData={currentCall}
        onEndCall={() => {
          router.replace('/manual-signaling');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
          {/* あなたのICE候補 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.stepTitle}>Step 3a: あなたのICE候補</Text>
              {connectionInfo.localIceCandidates.length > 0 && (
                <TouchableOpacity
                  onPress={() => copyToClipboard(
                    JSON.stringify(connectionInfo.localIceCandidates),
                    'すべてのICE候補'
                  )}
                  style={styles.copyAllButton}
                >
                  <Ionicons name="copy" size={18} color="#fff" />
                  <Text style={styles.copyAllButtonText}>全てコピー</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.stepDesc}>
              これらを相手に送信してください（{connectionInfo.localIceCandidates.length}個）
            </Text>
            {connectionInfo.localIceCandidates.map((candidate, index) => (
              <View key={index} style={styles.candidateItem}>
                <View style={styles.candidateHeader}>
                  <Text style={styles.candidateTitle}>候補 #{index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(JSON.stringify(candidate), `ICE候補 #${index + 1}`)}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy-outline" size={16} color="#007AFF" />
                    <Text style={styles.copyButtonText}>コピー</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.candidateText}
                  value={JSON.stringify(candidate)}
                  editable={false}
                  multiline
                />
              </View>
            ))}
            {connectionInfo.localIceCandidates.length === 0 && (
              <Text style={styles.waitingText}>ICE候補を収集中...</Text>
            )}
          </View>
          
          {/* 相手のICE候補を入力 */}
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Step 3b: 相手のICE候補を入力</Text>
            <Text style={styles.stepDesc}>
              相手から受け取ったICE候補を貼り付けてください{'\n'}
              追加済み: {connectionInfo.remoteIceCandidates.length}個
            </Text>
            <TextInput
              style={styles.textInput}
              value={iceCandidateInput}
              onChangeText={setIceCandidateInput}
              placeholder='{"candidate":"candidate:..."}'
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={addIceCandidate}
            >
              <Text style={styles.secondaryButtonText}>ICE候補を追加</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 ヒント: 両端末のICE候補をすべて追加すると、自動的に接続が確立されます
            </Text>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  stepDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  candidateItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  candidateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  candidateText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#666',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  copyAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

