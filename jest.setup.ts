jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Group: 'Group',
  Image: 'Image',
  Line: 'Line',
  matchFont: jest.fn((font = {}) => ({
    ...font,
    measureText: jest.fn(() => ({ width: 0 })),
  })),
  Path: 'Path',
  Rect: 'Rect',
  RoundedRect: 'RoundedRect',
  Text: 'Text',
  Skia: {
    Data: {
      fromBase64: jest.fn(() => 'sk-data'),
      fromURI: jest.fn(async () => 'sk-data'),
    },
    Font: jest.fn((_, fontSize) => ({
      fontSize,
      measureText: jest.fn((text = '') => ({ width: String(text).length * fontSize * 0.5 })),
      setEmbolden: jest.fn(),
    })),
    FontMgr: {
      System: jest.fn(() => ({
        matchFamilyStyle: jest.fn(() => 'sk-typeface'),
      })),
    },
    Image: {
      MakeImageFromEncoded: jest.fn(() => ({
        encodeToBase64: jest.fn(() => 'encoded-raster'),
      })),
    },
    Path: {
      Make: () => ({
        lineTo: jest.fn(),
        moveTo: jest.fn(),
      }),
      MakeFromSVGString: jest.fn(() => 'sk-path'),
    },
  },
  ImageFormat: {
    JPEG: 3,
    PNG: 4,
    WEBP: 6,
  },
  useFont: (_source: unknown, fontSize = 16) => ({
    fontSize,
    measureText: jest.fn((text = '') => ({ width: String(text).length * fontSize * 0.5 })),
  }),
  useImage: () => null,
}));

jest.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 400,
  Inter_700Bold: 700,
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
