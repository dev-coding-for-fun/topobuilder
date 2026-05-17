jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Group: 'Group',
  Image: 'Image',
  Line: 'Line',
  Path: 'Path',
  Rect: 'Rect',
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
