import { useManualSignaling } from '@/contexts/ManualSignalingContext';
import { webRTCService } from '@/services/WebRTCService';
import { compressForQRCode, decompressFromQRCode } from '@/utils/qrcode';
import { Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
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
import QRCode from 'react-native-qrcode-svg';

export default function ReceiverStep1() {
  const { offerInput, setOfferInput, connectionInfo, setConnectionInfo, setCurrentCall } = useManualSignaling();
  const [showAnswerText, setShowAnswerText] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  const handleQRCodeScanned = (data: string) => {
    if (!isScanning) return; // 既に読み取り済みの場合は何もしない
    
    setIsScanning(false); // スキャンを停止
    
    try {
      const decompressed = decompressFromQRCode(data);
      setOfferInput(JSON.stringify(decompressed));
      setShowQRScanner(false);
      Alert.alert('✅ QRコード読み取り成功', 'Offerが入力されました');
    } catch (error) {
      console.error('Failed to process QR code:', error);
      setShowQRScanner(false);
      Alert.alert('エラー', 'QRコードの読み取りに失敗しました');
    }
  };

  const receiveOffer = async () => {
    try {
      if (!offerInput.trim()) {
        Alert.alert('エラー', 'Offerを入力してください');
        return;
      }
      
      setIsProcessing(true);
      console.log('📥 Receiving offer...');
      const offer = JSON.parse(offerInput);
      
      // WebRTCサービスを初期化
      await webRTCService.getLocalStream(false);
      
      const callData = {
        id: 'manual-call',
        targetUser: 'manual-peer',
        type: 'incoming' as const,
        hasVideo: false,
        status: 'connected' as const,
      };
      
      await webRTCService.acceptCall(callData, offer);
      setCurrentCall(callData);
      
      // Answerを取得
      setTimeout(async () => {
        const pc = (webRTCService as any).peerConnection;
        if (pc && pc.localDescription) {
          const answer = pc.localDescription;
          setConnectionInfo(prev => ({ ...prev, answer }));
          
          // ICE候補はManualSignalingContextのonIceCandidateコールバックで自動収集される
          
          Alert.alert(
            '✅ Answer生成完了',
            '下に表示されているAnswerをコピーして相手に送信してください。\n\nICE候補も自動的に収集されています。'
          );
        }
        setIsProcessing(false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to receive offer:', error);
      Alert.alert('エラー', 'Offerの処理に失敗しました: ' + (error as Error).message);
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('コピー完了', `${label}をクリップボードにコピーしました`);
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
          {/* Step 1: Offer入力 */}
          {!connectionInfo.answer && (
            <View style={styles.section}>
              <Text style={styles.stepTitle}>Step 1: Offerを入力</Text>
              <Text style={styles.stepDesc}>
                相手から受け取ったOfferをQRコードでスキャンまたは貼り付けてください
              </Text>
              
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => {
                  setIsScanning(true);
                  setShowQRScanner(true);
                }}
              >
                <Ionicons name="qr-code-outline" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>QRコードをスキャン</Text>
              </TouchableOpacity>
              
              <Text style={styles.orText}>または</Text>
              
              <TextInput
                style={styles.textInput}
                value={offerInput}
                onChangeText={setOfferInput}
                placeholder='{"type":"offer","sdp":"v=0..."}'
                placeholderTextColor="#999"
                multiline
                numberOfLines={8}
              />
              
              <TouchableOpacity
                style={[styles.primaryButton, (!offerInput || isProcessing) && styles.primaryButtonDisabled]}
                onPress={receiveOffer}
                disabled={!offerInput || isProcessing}
              >
                <Text style={styles.primaryButtonText}>
                  {isProcessing ? '処理中...' : 'Offerを設定してAnswerを生成'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Answerの表示 */}
          {connectionInfo.answer && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.stepTitle}>📤 あなたのAnswer</Text>
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => setShowQRModal(true)}
                    >
                      <Ionicons name="qr-code-outline" size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(JSON.stringify(connectionInfo.answer), 'Answer')}
                    >
                      <Ionicons name="copy-outline" size={18} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.infoLabel}>
                  QRコードまたはテキストをコピーして相手に送信してください
                </Text>
                
                {/* テキスト表示（折りたたみ可能） */}
                <TouchableOpacity
                  style={styles.toggleTextButton}
                  onPress={() => setShowAnswerText(!showAnswerText)}
                >
                  <Text style={styles.toggleTextButtonText}>
                    {showAnswerText ? '▼' : '▶'} テキストを{showAnswerText ? '非表示' : '表示'}
                  </Text>
                </TouchableOpacity>
                
                {showAnswerText && (
                  <>
                    <TextInput
                      style={styles.textDisplay}
                      value={JSON.stringify(connectionInfo.answer, null, 2)}
                      multiline
                      editable={false}
                      scrollEnabled
                    />
                    <View style={styles.characterCount}>
                      <Text style={styles.characterCountText}>
                        文字数: {JSON.stringify(connectionInfo.answer).length}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/manual-signaling/receiver-step2')}
              >
                <Text style={styles.primaryButtonText}>次へ: ICE候補を交換</Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* QRコードスキャナーモーダル */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => {
          setIsScanning(true);
          setShowQRScanner(false);
        }}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>QRコードをスキャン</Text>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => {
                setIsScanning(true);
                setShowQRScanner(false);
              }}
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
              OfferのQRコードをフレーム内に収めてください
            </Text>
          </View>
        </View>
      </Modal>
      
      {/* QRコード表示モーダル */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQRModal(false)}
        >
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>Answer QRコード</Text>
            <Text style={styles.qrModalDesc}>
              相手にこのQRコードをスキャンしてもらってください
            </Text>
            {connectionInfo.answer && (
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={compressForQRCode(connectionInfo.answer)}
                  size={250}
                  backgroundColor="white"
                  ecl="L"
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.qrCloseButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
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
  textDisplay: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  characterCount: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  characterCountText: {
    fontSize: 12,
    color: '#999',
  },
  toggleTextButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toggleTextButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
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
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  qrButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
  scannerCloseButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  qrModalDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  qrCloseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  qrCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

