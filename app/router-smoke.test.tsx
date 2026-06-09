import React from 'react';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@/state/TopoStore', () => ({
  TopoStoreProvider: ({ children }: { children: React.ReactNode }) => children,
  useTopoStore: jest.fn(() => ({
    createCrag: jest.fn(),
    cragSummaries: [],
    isReady: true,
    loadGuidebookExport: jest.fn(),
    storageError: undefined,
    submitToTabvar: jest.fn(),
  })),
}));

jest.mock('@shopify/react-native-skia/lib/module/renderer/Offscreen', () => ({
  drawAsImage: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
  setOptions: jest.fn(),
}));

jest.mock('expo-router', () => {
  const Stack = Object.assign(({ children }: { children?: React.ReactNode }) => children ?? null, {
    Screen: () => null,
  });

  return {
    Stack,
    router: {
      push: jest.fn(),
      replace: jest.fn(),
    },
    useFocusEffect: jest.fn(),
    useLocalSearchParams: jest.fn(() => ({})),
    usePathname: jest.fn(() => '/'),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('react-native-keyboard-controller', () => {
  const { View } = require('react-native');
  return {
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('Expo Router route imports', () => {
  it('loads the app shell and primary routes without import-time errors', () => {
    expect(require('./_layout')).toHaveProperty('default', expect.any(Function));
    expect(require('./index')).toHaveProperty('default', expect.any(Function));
    expect(require('./settings/index')).toHaveProperty('default', expect.any(Function));
    expect(require('./tabvar-connect')).toHaveProperty('default', expect.any(Function));
  });
});
