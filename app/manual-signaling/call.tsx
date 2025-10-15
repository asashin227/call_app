import CallScreen from '@/components/CallScreen';
import { useManualSignaling } from '@/contexts/ManualSignalingContext';
import { router } from 'expo-router';
import React from 'react';

export default function Call() {
  const { currentCall, reset } = useManualSignaling();

  if (!currentCall) {
    // currentCallがない場合は最初に戻る
    router.replace('/manual-signaling');
    return null;
  }

  return (
    <CallScreen
      callData={currentCall}
      onEndCall={() => {
        reset();
        router.replace('/manual-signaling');
      }}
    />
  );
}

