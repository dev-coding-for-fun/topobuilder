jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Group: 'Group',
  Image: 'Image',
  Line: 'Line',
  matchFont: jest.fn((font: { fontSize?: number } = {}, fontMgr?: unknown) => ({
    ...font,
    fontMgr,
    fontSize: font.fontSize ?? 16,
    measureText: jest.fn((text = '') => ({ width: String(text).length * (font.fontSize ?? 16) * 0.5 })),
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
      getTextWidth: jest.fn((text = '') => String(text).length * fontSize * 0.5),
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
    Typeface: {
      MakeFreeTypeFaceFromData: jest.fn(() => 'sk-typeface'),
    },
    TypefaceFontProvider: {
      Make: jest.fn(() => ({
        registerFont: jest.fn(),
        matchFamilyStyle: jest.fn(() => 'sk-typeface'),
      })),
    },
  },
  ImageFormat: {
    JPEG: 3,
    PNG: 4,
    WEBP: 6,
  },
  useFont: jest.fn((_source: unknown, fontSize = 16) => ({
    fontSize,
    measureText: jest.fn((text = '') => ({ width: String(text).length * fontSize * 0.5 })),
  })),
  useFonts: jest.fn(() => 'sk-font-manager'),
  useTypeface: jest.fn(() => 'sk-typeface'),
  useImage: () => null,
}));

jest.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 400,
  Inter_700Bold: 700,
}));

jest.mock('expo-file-system', () => ({
  File: class File extends Blob {
    exists = true;
    uri: string;

    constructor(uri: string) {
      super([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
      this.uri = uri;
    }

    bytes() {
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    }
  },
}));

jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView } = require('react-native');
  return {
    KeyboardAwareScrollView: ScrollView,
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

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
