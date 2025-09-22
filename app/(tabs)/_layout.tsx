import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '発信',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="phone.arrow.up.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '受信',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="phone.arrow.down.left" color={color} />,
        }}
      />
    </Tabs>
  );
}
