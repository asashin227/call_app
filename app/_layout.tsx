import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import 'react-native-reanimated';

import CallScreen from '@/components/CallScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AudioRoute, audioRouteService } from '@/services/AudioRouteService';
import { audioService } from '@/services/AudioService';
import { CallData, webRTCService } from '@/services/WebRTCService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showCallScreen, setShowCallScreen] = useState(false);
  const [activeCallData, setActiveCallData] = useState<CallData | null>(null);

  // WebRTCの通話状態を監視してCallScreenを表示
  useEffect(() => {
    // 通話状態変更のリスナーを追加
    let statusChangeListener: ((status: string) => void) | null = null;
    
    statusChangeListener = (status: string) => {
      console.log('🔄 RootLayout: Call status changed to:', status);
      
      if (status === 'connected') {
        // 通話が確立したらCallScreenを表示
        // WebRTCServiceから現在の通話データを取得
        const currentCallData = webRTCService.getCurrentCall();
        if (currentCallData) {
          setActiveCallData(currentCallData);
          setShowCallScreen(true);
        } else {
          // フォールバック: CallDataを構築
          const callData: CallData = {
            id: webRTCService.getCallKeepUUID() || 'unknown',
            targetUser: 'Manual Peer',
            type: 'outgoing',
            status: 'connected',
            hasVideo: false,
          };
          setActiveCallData(callData);
          setShowCallScreen(true);
        }
      } else if (status === 'ended' || status === 'failed') {
        // 通話が終了したらCallScreenを非表示
        setShowCallScreen(false);
        setActiveCallData(null);
      }
    };

    // 定期的にWebRTCServiceの通話状態をチェック
    const checkInterval = setInterval(() => {
      const currentCallData = webRTCService.getCurrentCall();
      if (currentCallData && currentCallData.status === 'connected' && !showCallScreen) {
        console.log('🔄 RootLayout: Detected connected call via polling');
        setActiveCallData(currentCallData);
        setShowCallScreen(true);
      } else if (!currentCallData && showCallScreen) {
        console.log('🔄 RootLayout: Call ended detected via polling');
        setShowCallScreen(false);
        setActiveCallData(null);
      }
    }, 1000); // 1秒ごとにチェック

    return () => {
      // クリーンアップ
      clearInterval(checkInterval);
      statusChangeListener = null;
    };
  }, [showCallScreen]);

  // CallScreenを閉じる処理
  const handleEndCall = () => {
    setShowCallScreen(false);
    setActiveCallData(null);
    // WebRTCServiceをクリーンアップ（ManualSignalingContextのresetと同等）
    webRTCService.endCall();
  };

  // CallKitの初期設定をアプリ起動時に実行
  useEffect(() => {
    const setupCallKit = async () => {
      try {
        const options = {
          ios: {
            appName: 'Call App',
            maximumCallsPerCallGroup: '1',
            maximumCallGroups: '1',
            supportsVideo: false, // ビデオ通話を無効にして問題を回避
            includesCallsInRecents: true,
            ringtoneSound: 'system_ringtone_default',
            handleType: 'generic', // アカウント名やユーザー名などの汎用タイプ
            supportedHandleTypes: ['generic'], // 汎用タイプをサポート
            imageName: 'callkit_logo', // CallKit用のアイコン
            // より詳細な設定
            supportsHolding: true,
            supportsGrouping: false,
            supportsUngrouping: false,
          },
          android: {
            alertTitle: 'Permissions required',
            alertDescription: 'This application needs to access your phone accounts',
            cancelButton: 'Cancel',
            okButton: 'OK',
            additionalPermissions: [],
            selfManaged: false,
          },
        };

        // CallKitのセットアップ
        await RNCallKeep.setup(options);
        console.log('✅ CallKit setup completed successfully');

        // 必要なイベントハンドラーを設定
        RNCallKeep.addEventListener('didActivateAudioSession', () => {
          console.log('🔊 CallKit: Audio session activated');
          // オーディオセッションがアクティブになったことを処理
        });

        RNCallKeep.addEventListener('answerCall', async (data) => {
          console.log('📞 CallKit: Answer call -', data);
          
          // 通話接続音を再生
          try {
            console.log('🎵 CallKit: Playing connected audio');
            await audioService.handleCallStateChange('connected');
          } catch (audioError) {
            console.error('❌ CallKit: Failed to play connected audio:', audioError);
          }
          
          // 通話応答処理
          try {
            if (data.callUUID) {
              // CallKeepの通話をアクティブに設定
              RNCallKeep.setCurrentCallActive(data.callUUID);
              
              // WebRTCServiceのCallKeep UUIDと一致するか確認
              const currentUUID = webRTCService.getCallKeepUUID();
              if (currentUUID === data.callUUID) {
                console.log('✅ CallKit: CallKeep answer event matched with current call');
                // 必要に応じて追加の処理を実行
              }
            } else {
              console.warn('⚠️ CallKit: No callUUID in answerCall');
            }
          } catch (error) {
            console.error('Failed to activate call:', error);
          }
        });

        RNCallKeep.addEventListener('endCall', async (data) => {
          console.log('📞 CallKit: End call -', data);
          
          // 通話終了音を再生
          try {
            console.log('🎵 CallKit: Playing disconnect audio');
            await audioService.handleCallStateChange('ended');
          } catch (audioError) {
            console.error('❌ CallKit: Failed to play disconnect audio:', audioError);
          }
          
          // 通話終了処理
          try {
            if (data.callUUID) {
              // WebRTCServiceのCallKeep UUIDと一致するか確認
              const currentUUID = webRTCService.getCallKeepUUID();
              if (currentUUID === data.callUUID) {
                console.log('✅ CallKit: Ending WebRTC call that matches CallKeep UUID');
                // WebRTCの通話を終了
                await webRTCService.endCall();
              }
              
              // CallKeepの通話を終了
              RNCallKeep.endCall(data.callUUID);
            } else {
              console.warn('⚠️ CallKit: No callUUID in endCall');
            }
          } catch (error) {
            console.error('Failed to end call:', error);
          }
        });

        RNCallKeep.addEventListener('didDisplayIncomingCall', (data) => {
          console.log('📱 CallKit: Incoming call displayed -', data);
          console.log('- CallUUID:', data.callUUID);
          console.log('- Handle:', data.handle);
          console.log('- LocalizedCallerName:', data.localizedCallerName);
          console.log('- HasVideo:', data.hasVideo);
          // 着信表示完了の処理 - 実際のアプリでは着信音再生等
        });

        // 着信通話拒否処理（コメントのみ保持、実際の処理は上記のendCallで統合）
        // RNCallKeep.addEventListener('didRejectIncomingCall', ...) は型定義に含まれていないため削除

        // 通話保留・保留解除処理
        RNCallKeep.addEventListener('didToggleHoldCallAction', (data) => {
          console.log('⏸️ CallKit: Hold call toggled -', data);
          if (data.callUUID) {
            const isOnHold = data.hold;
            console.log(`- Call ${data.callUUID} ${isOnHold ? 'put on hold' : 'taken off hold'}`);
            // 実際のアプリでは保留状態の管理を実装
          }
        });

        // 通話接続・失敗処理（コメントのみ保持、型定義にないため削除）
        // RNCallKeep.addEventListener('didReportConnectedOutgoingCallWithUUID', ...) は型定義に含まれていないため削除
        // RNCallKeep.addEventListener('didReportFailedOutgoingCallWithUUID', ...) は型定義に含まれていないため削除

        RNCallKeep.addEventListener('didChangeAudioRoute', (data) => {
          console.log('🎧 CallKit: Audio route changed -', data);
          console.log(`- Reason: ${data.reason}, Output: ${data.output}`);
          
          // AudioRouteServiceに通知して、アプリUI側と同期
          const route = (data.output || 'Unknown') as AudioRoute;
          audioRouteService.handleCallKitRouteChange(route, data.reason || 0);
        });

        // 発信通話の処理
        RNCallKeep.addEventListener('didReceiveStartCallAction', (data) => {
          console.log('🚀 CallKit: Did receive start call action -', data);
          // 発信通話の処理 - 実際のアプリでは通話接続処理を開始
          try {
            if (data.callUUID) {
              // callUUIDをローカル変数にキャプチャ
              const callUUID = data.callUUID;
              
              // 通話接続開始をシミュレート（実際のアプリでは実際の通話処理）
              console.log('📞 CallKit: Simulating call connection for UUID:', callUUID);
              
              // 接続成功をCallKitに通知（少し遅延させる）
              setTimeout(() => {
                try {
                  RNCallKeep.reportConnectedOutgoingCallWithUUID(callUUID);
                  console.log('✅ CallKit: Successfully reported connected outgoing call');
                } catch (reportError) {
                  console.error('❌ CallKit: Failed to report connected outgoing call:', reportError);
                }
              }, 1000);
            } else {
              console.warn('⚠️ CallKit: No callUUID in didReceiveStartCallAction');
            }
          } catch (error) {
            console.error('❌ CallKit: Failed to handle start call action:', error);
          }
        });

        // 通話状態の管理
        RNCallKeep.addEventListener('didPerformDTMFAction', (data) => {
          console.log('🎹 CallKit: DTMF action -', data);
        });

        RNCallKeep.addEventListener('didPerformSetMutedCallAction', (data) => {
          console.log('🔇 CallKit: Set muted -', data);
          
          // WebRTCServiceのミュート状態を更新
          try {
            if (data.callUUID) {
              const currentUUID = webRTCService.getCallKeepUUID();
              if (currentUUID === data.callUUID) {
                console.log(`🔇 CallKit: Updating WebRTC mute state to: ${data.muted}`);
                
                // 現在のミュート状態を取得して必要に応じて切り替え
                const localStream = webRTCService.getCurrentLocalStream();
                if (localStream) {
                  const audioTrack = localStream.getAudioTracks()[0];
                  if (audioTrack) {
                    // data.mutedがtrueならミュート、falseならミュート解除
                    audioTrack.enabled = !data.muted;
                    console.log(`✅ CallKit: Audio track enabled set to: ${audioTrack.enabled}`);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ CallKit: Failed to update mute state:', error);
          }
        });

      } catch (error) {
        console.error('CallKit setup failed:', error);
      }
    };

    setupCallKit();
    
    // クリーンアップ
    return () => {
      // CallKitイベントリスナーをクリーンアップ
      RNCallKeep.removeEventListener('didActivateAudioSession');
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('endCall');
      RNCallKeep.removeEventListener('didDisplayIncomingCall');
      RNCallKeep.removeEventListener('didToggleHoldCallAction');
      RNCallKeep.removeEventListener('didChangeAudioRoute');
      RNCallKeep.removeEventListener('didReceiveStartCallAction');
      RNCallKeep.removeEventListener('didPerformDTMFAction');
      RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
      
      // AudioServiceをクリーンアップ
      audioService.cleanup().catch((error) => {
        console.error('❌ Failed to cleanup audio service:', error);
      });
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="manual-signaling" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      
      {/* グローバル通話画面モーダル */}
      <Modal
        visible={showCallScreen && activeCallData !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleEndCall}
      >
        {activeCallData && (
          <CallScreen
            callData={activeCallData}
            onEndCall={handleEndCall}
          />
        )}
      </Modal>
    </ThemeProvider>
  );
}
