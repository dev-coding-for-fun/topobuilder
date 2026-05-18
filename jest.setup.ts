jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Group: 'Group',
  Image: 'Image',
  Line: 'Line',
  matchFont: jest.fn(() => ({
    measureText: jest.fn(() => ({ width: 0 })),
  })),
  Path: 'Path',
  Rect: 'Rect',
  RoundedRect: 'RoundedRect',
  Text: 'Text',
  Skia: {
    Path: {
      Make: () => ({
        lineTo: jest.fn(),
        moveTo: jest.fn(),
      }),
    },
  },
  useFont: () => ({
    measureText: jest.fn(() => ({ width: 0 })),
  }),
  useImage: () => null,
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  getUseOfValueInStyleWarning: () => undefined,
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  useDerivedValue: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => {
    const React = require('react');
    return React.useRef({ value }).current;
  },
}));
