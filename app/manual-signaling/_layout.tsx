import { ManualSignalingProvider } from '@/contexts/ManualSignalingContext';
import { Stack } from 'expo-router';

export default function ManualSignalingLayout() {
  return (
    <ManualSignalingProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: '戻る',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: '手動シグナリング',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="caller-step1"
          options={{
            title: '発信側 - Step 1',
          }}
        />
        <Stack.Screen
          name="caller-step2"
          options={{
            title: '発信側 - Step 2',
          }}
        />
        <Stack.Screen
          name="caller-step3"
          options={{
            title: '発信側 - Step 3',
          }}
        />
        <Stack.Screen
          name="receiver-step1"
          options={{
            title: '受信側 - Step 1',
          }}
        />
        <Stack.Screen
          name="receiver-step2"
          options={{
            title: '受信側 - Step 2',
          }}
        />
        <Stack.Screen
          name="call"
          options={{
            title: '通話中',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ManualSignalingProvider>
  );
}

