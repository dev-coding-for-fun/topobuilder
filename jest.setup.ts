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
  Text: 'Text',
  Skia: {
    Path: {
      Make: () => ({
        lineTo: jest.fn(),
        moveTo: jest.fn(),
      }),
    },
  },
  useImage: () => null,
}));
