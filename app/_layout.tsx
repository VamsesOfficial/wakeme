// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { setupNotificationHandler } from '../src/lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationHandler();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050508' },
          animation: 'fade',
        }}
      />
    </GestureHandlerRootView>
  );
}
