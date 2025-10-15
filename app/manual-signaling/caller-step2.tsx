import { useManualSignaling } from '@/contexts/ManualSignalingContext';
import { decompressFromQRCode } from '@/utils/qrcode';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
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
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRCodeScanned = (data: string) => {
    try {
      setShowQRScanner(false);
      const decompressed = decompressFromQRCode(data);
      setAnswerInput(JSON.stringify(decompressed));
      Alert.alert('✅ QRコード読み取り成功', 'Answerが入力されました');
    } catch (error) {
      console.error('Failed to process QR code:', error);
      Alert.alert('エラー', 'QRコードの読み取りに失敗しました');
    }
  };

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
              相手から受け取ったAnswerをQRコードでスキャンまたは貼り付けてください
            </Text>
            
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowQRScanner(true)}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>QRコードをスキャン</Text>
            </TouchableOpacity>
            
            <Text style={styles.orText}>または</Text>
            
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
      
      {/* QRコードスキャナーモーダル */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QRコードをスキャン</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQRScanner(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={({ data }) => {
              if (data) {
                handleQRCodeScanned(data);
              }
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerText}>
              AnswerのQRコードをフレーム内に収めてください
            </Text>
          </View>
        </View>
      </Modal>
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
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scannerText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

