import { webRTCService } from '@/services/WebRTCService';
import { Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CallScreen from './CallScreen';

type Mode = 'select' | 'caller' | 'receiver' | 'active';
type Step = 'generate' | 'wait-answer' | 'add-ice' | 'connecting' | 'connected';

interface ConnectionInfo {
  offer?: any;
  answer?: any;
  localIceCandidates: any[];
  remoteIceCandidates: any[];
}

interface ManualSignalingScreenProps {
  onClose?: () => void;
}

export default function ManualSignalingScreen({ onClose }: ManualSignalingScreenProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [step, setStep] = useState<Step>('generate');
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    localIceCandidates: [],
    remoteIceCandidates: [],
  });
  
  const [offerInput, setOfferInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [iceCandidateInput, setIceCandidateInput] = useState('');
  const [currentCall, setCurrentCall] = useState<any>(null);
  
  // テキスト表示/非表示の制御
  const [showOfferText, setShowOfferText] = useState(true);
  const [showAnswerText, setShowAnswerText] = useState(true);
  
  // WebRTCの初期化
  useEffect(() => {
    webRTCService.setEventListeners({
      onLocalStream: (stream) => {
        console.log('📱 Local stream ready');
      },
      onRemoteStream: (stream) => {
        console.log('📱 Remote stream received');
        setStep('connected');
        setMode('active');
      },
      onCallStatusChange: (status) => {
        console.log('📱 Call status:', status);
        if (status === 'connected') {
          setStep('connected');
          setMode('active');
        }
      },
      onError: (error) => {
        console.error('❌ WebRTC error:', error);
        Alert.alert('エラー', error.message);
      },
    });
  }, []);
  
  // 発信側: Offerを生成
  const generateOffer = async () => {
    try {
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
          
          setStep('wait-answer');
          Alert.alert(
            '✅ Offer生成完了',
            '下に表示されているOfferをコピーして相手に送信してください。\n\n相手からAnswerが届いたら入力してください。'
          );
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to generate offer:', error);
      Alert.alert('エラー', 'Offerの生成に失敗しました');
    }
  };
  
  // 受信側: Offerを受け取ってAnswerを生成
  const receiveOffer = async () => {
    try {
      if (!offerInput.trim()) {
        Alert.alert('エラー', 'Offerを入力してください');
        return;
      }
      
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
          
          // ICE候補の収集を開始
          pc.onicecandidate = (event: any) => {
            if (event.candidate) {
              console.log('🧊 ICE candidate generated');
              setConnectionInfo(prev => ({
                ...prev,
                localIceCandidates: [...prev.localIceCandidates, event.candidate],
              }));
            }
          };
          
          setStep('add-ice');
          Alert.alert(
            '✅ Answer生成完了',
            '下に表示されているAnswerをコピーして相手に送信してください。\n\n相手からICE候補が届いたら順次入力してください。'
          );
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to receive offer:', error);
      Alert.alert('エラー', 'Offerの処理に失敗しました: ' + (error as Error).message);
    }
  };
  
  // 発信側: Answerを受け取る
  const receiveAnswer = async () => {
    try {
      if (!answerInput.trim()) {
        Alert.alert('エラー', 'Answerを入力してください');
        return;
      }
      
      console.log('📥 Receiving answer...');
      const answer = JSON.parse(answerInput);
      
      const pc = (webRTCService as any).peerConnection;
      if (pc) {
        await pc.setRemoteDescription(answer);
        setStep('add-ice');
        Alert.alert(
          '✅ Answer設定完了',
          '相手からICE候補が届いたら順次入力してください。\nあなたのICE候補も相手に送信してください。'
        );
      }
      
    } catch (error) {
      console.error('❌ Failed to receive answer:', error);
      Alert.alert('エラー', 'Answerの処理に失敗しました: ' + (error as Error).message);
    }
  };
  
  // ICE候補を追加
  const addIceCandidate = async () => {
    try {
      if (!iceCandidateInput.trim()) {
        Alert.alert('エラー', 'ICE候補を入力してください');
        return;
      }
      
      console.log('🧊 Adding ICE candidate...');
      const candidate = JSON.parse(iceCandidateInput);
      
      const pc = (webRTCService as any).peerConnection;
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
  
  // コピー機能
  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('コピー完了', `${label}をクリップボードにコピーしました`);
  };
  
  // リセット
  const reset = () => {
    if (mode === 'select') {
      // モード選択画面の場合は直接閉じる
      if (onClose) {
        onClose();
      }
      return;
    }
    
    Alert.alert(
      '確認',
      '現在のセッションをリセットしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            webRTCService.endCall();
            setMode('select');
            setStep('generate');
            setConnectionInfo({
              localIceCandidates: [],
              remoteIceCandidates: [],
            });
            setOfferInput('');
            setAnswerInput('');
            setIceCandidateInput('');
            setCurrentCall(null);
          },
        },
      ]
    );
  };
  
  // 通話中画面
  if (mode === 'active' && currentCall) {
    return (
      <CallScreen
        callData={currentCall}
        onEndCall={() => {
          setMode('select');
          setStep('generate');
          setCurrentCall(null);
        }}
      />
    );
  }
  
  // モード選択画面
  if (mode === 'select') {
    return (
      <SafeAreaView style={styles.fullScreenContainer}>
        <View style={styles.header}>
          {onClose && (
            <TouchableOpacity onPress={reset} style={styles.backButton}>
              <Ionicons name="close" size={28} color="#007AFF" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>🔧 手動シグナリング</Text>
          <Text style={styles.subtitle}>
            シグナリングサーバーなしで通話をテストできます
          </Text>
        </View>
        
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('caller')}
          >
            <Ionicons name="call-outline" size={40} color="#007AFF" />
            <Text style={styles.modeButtonTitle}>発信側（Caller）</Text>
            <Text style={styles.modeButtonDesc}>
              Offerを生成して相手に送信
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('receiver')}
          >
            <Ionicons name="call-sharp" size={40} color="#34C759" />
            <Text style={styles.modeButtonTitle}>受信側（Receiver）</Text>
            <Text style={styles.modeButtonDesc}>
              Offerを受け取ってAnswerを返信
            </Text>
          </TouchableOpacity>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📋 必要な情報</Text>
            <Text style={styles.infoText}>
              1. SDP Offer（発信側→受信側）{'\n'}
              2. SDP Answer（受信側→発信側）{'\n'}
              3. ICE候補（両方向、複数個）{'\n'}
              {'\n'}
              これらをメール、SMS、メッセージアプリなどで交換します
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // 発信側画面
  if (mode === 'caller') {
    return (
      <SafeAreaView style={styles.fullScreenContainer}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={reset} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>📞 発信側（Caller）</Text>
            <Text style={styles.subtitle}>Step {step === 'generate' ? '1' : step === 'wait-answer' ? '2' : '3'} / 3</Text>
          </View>
          
          <View style={styles.content}>
            {/* Step 1: Offer生成 */}
            {step === 'generate' && (
              <View>
                <Text style={styles.stepTitle}>Step 1: Offerを生成</Text>
                <Text style={styles.stepDesc}>
                  まず、あなたの接続情報（Offer）を生成します
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={generateOffer}
                >
                  <Text style={styles.primaryButtonText}>Offerを生成</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Offerの表示 */}
            {connectionInfo.offer && (
              <View style={styles.infoSection}>
                <View style={styles.infoSectionHeader}>
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
            )}
            
            {/* Step 2: Answer入力 */}
            {step === 'wait-answer' && (
              <View style={styles.infoSection}>
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
            )}
            
            {/* Step 3: ICE候補 */}
            {step === 'add-ice' && (
              <View>
                {/* あなたのICE候補 */}
                <View style={styles.infoSection}>
                  <Text style={styles.stepTitle}>Step 3a: あなたのICE候補</Text>
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
                </View>
                
                {/* 相手のICE候補を入力 */}
                <View style={styles.infoSection}>
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
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  // 受信側画面
  if (mode === 'receiver') {
    return (
      <SafeAreaView style={styles.fullScreenContainer}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={reset} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>📲 受信側（Receiver）</Text>
            <Text style={styles.subtitle}>Step {step === 'generate' ? '1' : '2'} / 2</Text>
          </View>
          
          <View style={styles.content}>
            {/* Step 1: Offer入力 */}
            {step === 'generate' && (
              <View style={styles.infoSection}>
                <Text style={styles.stepTitle}>Step 1: Offerを入力</Text>
                <Text style={styles.stepDesc}>
                  相手から受け取ったOfferを貼り付けてください
                </Text>
                
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
                  style={[styles.primaryButton, !offerInput && styles.primaryButtonDisabled]}
                  onPress={receiveOffer}
                  disabled={!offerInput}
                >
                  <Text style={styles.primaryButtonText}>Offerを設定してAnswerを生成</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Answerの表示 */}
            {connectionInfo.answer && (
              <View style={styles.infoSection}>
                <View style={styles.infoSectionHeader}>
                  <Text style={styles.stepTitle}>📤 あなたのAnswer</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(JSON.stringify(connectionInfo.answer), 'Answer')}
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
            )}
            
            {/* Step 2: ICE候補 */}
            {step === 'add-ice' && (
              <View>
                {/* あなたのICE候補 */}
                <View style={styles.infoSection}>
                  <Text style={styles.stepTitle}>Step 2a: あなたのICE候補</Text>
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
                </View>
                
                {/* 相手のICE候補を入力 */}
                <View style={styles.infoSection}>
                  <Text style={styles.stepTitle}>Step 2b: 相手のICE候補を入力</Text>
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
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  return null;
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    zIndex: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  modeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modeButtonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modeButtonDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
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
  characterCount: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  characterCountText: {
    fontSize: 12,
    color: '#999',
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
  textActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
});

