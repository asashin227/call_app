import CallScreen from '@/components/CallScreen';
import { useManualSignaling } from '@/contexts/ManualSignalingContext';
import { webRTCService } from '@/services/WebRTCService';
import { Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
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

export default function CallerStep1() {
  const { connectionInfo, setConnectionInfo, currentCall, setCurrentCall } = useManualSignaling();
  const [showOfferText, setShowOfferText] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateOffer = async () => {
    try {
      setIsGenerating(true);
      console.log('🎥 Generating offer...');
      
      const callData = await webRTCService.startCall('manual-peer', false);
      setCurrentCall(callData);
      
      // Offerを取得（少し待つ必要がある）
      setTimeout(async () => {
        const pc = (webRTCService as any).peerConnection;
        if (pc && pc.localDescription) {
          const offer = pc.localDescription;
          setConnectionInfo(prev => ({ ...prev, offer }));
          
          // ICE候補の収集を開始
          pc.onicecandidate = (event: any) => {
            if (event.candidate) {
              console.log('🧊 ICE candidate generated');
              setConnectionInfo(prev => ({
                ...prev,
                localIceCandidates: [...prev.localIceCandidates, event.candidate],
              }));
            } else {
              console.log('✅ ICE gathering completed');
            }
          };
          
          Alert.alert(
            '✅ Offer生成完了',
            '下に表示されているOfferをコピーして相手に送信してください。\n\n相手からAnswerが届いたら次のステップに進んでください。'
          );
        }
        setIsGenerating(false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to generate offer:', error);
      Alert.alert('エラー', 'Offerの生成に失敗しました');
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('コピー完了', `${label}をクリップボードにコピーしました`);
  };

  // 通話中の場合はCallScreenを表示
  if (currentCall && connectionInfo.answer) {
    return (
      <CallScreen
        callData={currentCall}
        onEndCall={() => {
          router.back();
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
          {/* Step 1: Offer生成 */}
          {!connectionInfo.offer && (
            <View style={styles.section}>
              <Text style={styles.stepTitle}>Step 1: Offerを生成</Text>
              <Text style={styles.stepDesc}>
                まず、あなたの接続情報（Offer）を生成します
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, isGenerating && styles.primaryButtonDisabled]}
                onPress={generateOffer}
                disabled={isGenerating}
              >
                <Text style={styles.primaryButtonText}>
                  {isGenerating ? '生成中...' : 'Offerを生成'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Offerの表示 */}
          {connectionInfo.offer && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.stepTitle}>📤 あなたのOffer</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(JSON.stringify(connectionInfo.offer), 'Offer')}
                  >
                    <Ionicons name="copy-outline" size={20} color="#007AFF" />
                    <Text style={styles.copyButtonText}>コピー</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.infoLabel}>
                  下のテキストをコピーして相手に送信してください
                </Text>
                
                {/* テキスト表示（折りたたみ可能） */}
                <TouchableOpacity
                  style={styles.toggleTextButton}
                  onPress={() => setShowOfferText(!showOfferText)}
                >
                  <Text style={styles.toggleTextButtonText}>
                    {showOfferText ? '▼' : '▶'} テキストを{showOfferText ? '非表示' : '表示'}
                  </Text>
                </TouchableOpacity>
                
                {showOfferText && (
                  <>
                    <TextInput
                      style={styles.textDisplay}
                      value={JSON.stringify(connectionInfo.offer, null, 2)}
                      multiline
                      editable={false}
                      scrollEnabled
                    />
                    <View style={styles.characterCount}>
                      <Text style={styles.characterCountText}>
                        文字数: {JSON.stringify(connectionInfo.offer).length}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/manual-signaling/caller-step2')}
              >
                <Text style={styles.primaryButtonText}>次へ: Answerを入力</Text>
              </TouchableOpacity>
            </>
          )}
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
});

