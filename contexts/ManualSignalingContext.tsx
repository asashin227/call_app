import { webRTCService } from '@/services/WebRTCService';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ConnectionInfo {
  offer?: any;
  answer?: any;
  localIceCandidates: any[];
  remoteIceCandidates: any[];
}

interface ManualSignalingContextType {
  connectionInfo: ConnectionInfo;
  setConnectionInfo: React.Dispatch<React.SetStateAction<ConnectionInfo>>;
  currentCall: any;
  setCurrentCall: React.Dispatch<React.SetStateAction<any>>;
  offerInput: string;
  setOfferInput: React.Dispatch<React.SetStateAction<string>>;
  answerInput: string;
  setAnswerInput: React.Dispatch<React.SetStateAction<string>>;
  iceCandidateInput: string;
  setIceCandidateInput: React.Dispatch<React.SetStateAction<string>>;
  callKeepUUID: string | null;
  setCallKeepUUID: React.Dispatch<React.SetStateAction<string | null>>;
  reset: () => void;
}

const ManualSignalingContext = createContext<ManualSignalingContextType | undefined>(undefined);

export function ManualSignalingProvider({ children }: { children: React.ReactNode }) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    localIceCandidates: [],
    remoteIceCandidates: [],
  });
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [offerInput, setOfferInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [iceCandidateInput, setIceCandidateInput] = useState('');
  const [callKeepUUID, setCallKeepUUID] = useState<string | null>(null);

  useEffect(() => {
    webRTCService.setEventListeners({
      onLocalStream: (stream) => {
        console.log('📱 Local stream ready');
      },
      onRemoteStream: (stream) => {
        console.log('📱 Remote stream received');
      },
      onCallStatusChange: (status) => {
        console.log('📱 Call status:', status);
      },
      onIceCandidate: (candidate) => {
        console.log('🧊 ICE candidate received in context');
        // ローカルICE候補を収集
        setConnectionInfo(prev => ({
          ...prev,
          localIceCandidates: [...prev.localIceCandidates, candidate],
        }));
      },
      onError: (error) => {
        console.error('❌ WebRTC error:', error);
      },
    });
  }, []);

  const reset = () => {
    webRTCService.endCall();
    setConnectionInfo({
      localIceCandidates: [],
      remoteIceCandidates: [],
    });
    setOfferInput('');
    setAnswerInput('');
    setIceCandidateInput('');
    setCurrentCall(null);
    setCallKeepUUID(null);
  };

  return (
    <ManualSignalingContext.Provider
      value={{
        connectionInfo,
        setConnectionInfo,
        currentCall,
        setCurrentCall,
        offerInput,
        setOfferInput,
        answerInput,
        setAnswerInput,
        iceCandidateInput,
        setIceCandidateInput,
        callKeepUUID,
        setCallKeepUUID,
        reset,
      }}
    >
      {children}
    </ManualSignalingContext.Provider>
  );
}

export function useManualSignaling() {
  const context = useContext(ManualSignalingContext);
  if (context === undefined) {
    throw new Error('useManualSignaling must be used within a ManualSignalingProvider');
  }
  return context;
}

