import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TopoStoreProvider } from '@/state/TopoStore';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TopoStoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: '#F8FAFC' },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F8FAFC' },
          }}
        />
      </TopoStoreProvider>
    </GestureHandlerRootView>
  );
}
