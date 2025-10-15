import { useManualSignaling } from '@/contexts/ManualSignalingContext';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

export default function CallerStep2() {
  const { answerInput, setAnswerInput, connectionInfo, setConnectionInfo } = useManualSignaling();
  const [showAnswerText, setShowAnswerText] = useState(true);

  const receiveAnswer = async () => {
    try {
      if (!answerInput.trim()) {
        Alert.alert('エラー', 'Answerを入力してください');
        return;
      }
      
      console.log('📥 Receiving answer...');
      const answer = JSON.parse(answerInput);
      
      const pc = (require('@/services/WebRTCService').webRTCService as any).peerConnection;
      if (pc) {
        await pc.setRemoteDescription(answer);
        setConnectionInfo(prev => ({ ...prev, answer }));
        
        Alert.alert(
          '✅ Answer設定完了',
          '次のステップでICE候補を交換します。',
          [
            {
              text: 'OK',
              onPress: () => router.push('/manual-signaling/caller-step3'),
            },
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ Failed to receive answer:', error);
      Alert.alert('エラー', 'Answerの処理に失敗しました: ' + (error as Error).message);
    }
  };

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
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Step 2: Answerを入力</Text>
            <Text style={styles.stepDesc}>
              相手から受け取ったAnswerを貼り付けてください
            </Text>
            
            <TextInput
              style={styles.textInput}
              value={answerInput}
              onChangeText={setAnswerInput}
              placeholder='{"type":"answer","sdp":"v=0..."}'
              placeholderTextColor="#999"
              multiline
              numberOfLines={8}
            />
            
            <TouchableOpacity
              style={[styles.primaryButton, !answerInput && styles.primaryButtonDisabled]}
              onPress={receiveAnswer}
              disabled={!answerInput}
            >
              <Text style={styles.primaryButtonText}>Answerを設定</Text>
            </TouchableOpacity>
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
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
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
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
});

