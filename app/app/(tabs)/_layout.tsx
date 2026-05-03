import { Tabs } from 'expo-router';
import React from 'react';

import { BottomNavBar } from '@/components/BottomNavBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomNavBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="character" options={{ title: 'Hero' }} />
      <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
      <Tabs.Screen name="profile" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
