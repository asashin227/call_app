import { IncomingCallRequest, signalingService } from '@/services/SignalingService';
import { CallData, webRTCService } from '@/services/WebRTCService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import CallScreen from './CallScreen';

const { width, height } = Dimensions.get('window');

interface WebRTCCallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WebRTCCallModal({ visible, onClose }: WebRTCCallModalProps) {
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallRequest | null>(null);
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');

  // シグナリングサービスのイベントリスナーを設定
  useEffect(() => {
    const handleIncomingCall = (call: IncomingCallRequest) => {
      console.log('📞 WebRTCCallModal: Incoming call received from:', call.from.name);
      setIncomingCall(call);
      setCallState('incoming');
    };

    const handleCallAccepted = (callId: string) => {
      console.log('✅ WebRTCCallModal: Call accepted:', callId);
      setCallState('active');
      setIncomingCall(null);
    };

    const handleCallEnded = (callId: string) => {
      console.log('🔚 WebRTCCallModal: Call ended:', callId);
      handleEndCall();
    };

    // イベントリスナーを登録
    signalingService.on('incoming_call', handleIncomingCall);
    signalingService.on('call_accepted', handleCallAccepted);
    signalingService.on('call_ended', handleCallEnded);

    return () => {
      // クリーンアップ
      signalingService.off('incoming_call', handleIncomingCall);
      signalingService.off('call_accepted', handleCallAccepted);
      signalingService.off('call_ended', handleCallEnded);
    };
  }, []);

  // 現在の通話状態を監視
  useEffect(() => {
    const checkCurrentCall = () => {
      const call = webRTCService.getCurrentCall();
      if (call && call !== currentCall) {
        setCurrentCall(call);
        setCallState('active');
      }
    };

    // 定期的に通話状態をチェック
    const interval = setInterval(checkCurrentCall, 1000);

    return () => clearInterval(interval);
  }, [currentCall]);

  // 着信を受諾
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      console.log('✅ WebRTCCallModal: Accepting incoming call...');
      
      // 着信の詳細情報を使用してCallDataを作成
      const callData: CallData = {
        id: incomingCall.callId,
        targetUser: incomingCall.from.name,
        type: 'incoming',
        hasVideo: incomingCall.hasVideo,
        status: 'connected',
      };

      setCurrentCall(callData);
      setCallState('active');
      setIncomingCall(null);

      // シグナリングサービスに受諾を通知（実際のオファーは自動処理）
      // await signalingService.acceptCall(incomingCall.callId, offer);

    } catch (error) {
      console.error('❌ WebRTCCallModal: Failed to accept call:', error);
      Alert.alert('エラー', '通話の受諾に失敗しました');
      rejectIncomingCall();
    }
  };

  // 着信を拒否
  const rejectIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      console.log('❌ WebRTCCallModal: Rejecting incoming call...');
      await signalingService.rejectCall(incomingCall.callId);
      setIncomingCall(null);
      setCallState('idle');
    } catch (error) {
      console.error('❌ WebRTCCallModal: Failed to reject call:', error);
      setIncomingCall(null);
      setCallState('idle');
    }
  };

  // 通話終了
  const handleEndCall = () => {
    console.log('🔚 WebRTCCallModal: Handling call end...');
    setCurrentCall(null);
    setIncomingCall(null);
    setCallState('idle');
    onClose();
  };

  // 着信画面をレンダリング
  const renderIncomingCallScreen = () => {
    if (!incomingCall) return null;

    return (
      <View style={styles.incomingCallContainer}>
        <View style={styles.incomingCallContent}>
          {/* 発信者情報 */}
          <View style={styles.callerInfo}>
            <View style={styles.callerAvatar}>
              <Text style={styles.callerAvatarText}>
                {incomingCall.from.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.callerName}>{incomingCall.from.name}</Text>
            <Text style={styles.incomingCallLabel}>
              {incomingCall.hasVideo ? 'ビデオ通話' : '音声通話'}の着信
            </Text>
          </View>

          {/* 受諾・拒否ボタン */}
          <View style={styles.incomingCallButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={rejectIncomingCall}
            >
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={acceptIncomingCall}
            >
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleEndCall}
    >
      {callState === 'incoming' && renderIncomingCallScreen()}
      
      {callState === 'active' && currentCall && (
        <CallScreen
          callData={currentCall}
          onEndCall={handleEndCall}
        />
      )}
      
      {callState === 'idle' && (
        <View style={styles.idleContainer}>
          <Text style={styles.idleText}>通話待機中...</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  incomingCallContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingCallContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 80,
  },
  callerAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  callerAvatarText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  incomingCallLabel: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
  },
  incomingCallButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 200,
  },
  acceptButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  rejectButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    transform: [{ rotate: '135deg' }],
  },
  idleContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleText: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 20,
  },
  closeButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
