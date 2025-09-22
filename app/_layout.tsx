import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import RNCallKeep from 'react-native-callkeep';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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

        RNCallKeep.addEventListener('answerCall', (data) => {
          console.log('📞 CallKit: Answer call -', data);
          // 通話応答処理 - 実際のアプリでは通話開始処理を実装
          try {
            if (data.callUUID) {
              RNCallKeep.setCurrentCallActive(data.callUUID);
            } else {
              console.warn('⚠️ CallKit: No callUUID in answerCall');
            }
          } catch (error) {
            console.error('Failed to activate call:', error);
          }
        });

        RNCallKeep.addEventListener('endCall', (data) => {
          console.log('📞 CallKit: End call -', data);
          // 通話終了処理
          try {
            if (data.callUUID) {
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
          // 着信表示完了の処理
        });

        RNCallKeep.addEventListener('didChangeAudioRoute', (data) => {
          console.log('🎧 CallKit: Audio route changed -', data);
          // オーディオルート変更の処理
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
        });

      } catch (error) {
        console.error('CallKit setup failed:', error);
      }
    };

    setupCallKit();
    
    // クリーンアップ
    return () => {
      RNCallKeep.removeEventListener('didActivateAudioSession');
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('endCall');
      RNCallKeep.removeEventListener('didDisplayIncomingCall');
      RNCallKeep.removeEventListener('didChangeAudioRoute');
      RNCallKeep.removeEventListener('didReceiveStartCallAction');
      RNCallKeep.removeEventListener('didPerformDTMFAction');
      RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
