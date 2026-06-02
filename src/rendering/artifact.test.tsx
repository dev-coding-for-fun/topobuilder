import { ImageFormat } from '@shopify/react-native-skia';
import { drawAsImage } from '@shopify/react-native-skia/lib/module/renderer/Offscreen';

import type { TopoProject } from '@/domain/types';

import { loadExportSkiaTypefaces } from './exportFonts';
import { renderTopoRasterBase64 } from './artifact';
import { SkiaTopoScene, SkiaTopoStaticScene } from './SkiaTopoRenderer';

jest.mock('@shopify/react-native-skia/lib/module/renderer/Offscreen', () => ({
  drawAsImage: jest.fn(async () => ({
    encodeToBase64: jest.fn(() => 'encoded-raster'),
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: {
    Base64: 'base64',
  },
  readAsStringAsync: jest.fn(async () => 'encoded-photo'),
}));

jest.mock('./exportFonts', () => ({
  loadExportSkiaTypefaces: jest.fn(async () => ({
    '400': 'regular-typeface',
    '700': 'bold-typeface',
  })),
}));

const project: TopoProject = {
  id: 'topo-1',
  name: 'Export Text Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [
    {
      id: 'photo-1',
      topoId: 'topo-1',
      uri: 'file://photo.jpg',
      width: 1000,
      height: 800,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  routes: [],
  annotations: [
    {
      id: 'label-1',
      topoId: 'topo-1',
      kind: 'label',
      color: '#111827',
      label: 'Pitch 1',
      point: { x: 0.4, y: 0.5 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('renderTopoRasterBase64', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders exported annotations through the static Skia scene', async () => {
    await renderTopoRasterBase64(project, project.photos[0], {
      format: ImageFormat.PNG,
      targetWidth: 1000,
    });

    const element = (drawAsImage as jest.Mock).mock.calls[0][0];
    expect(loadExportSkiaTypefaces).toHaveBeenCalledTimes(1);
    expect(element.props.children).toContainEqual(
      expect.objectContaining({
        props: expect.objectContaining({
          typefaces: {
            '400': 'regular-typeface',
            '700': 'bold-typeface',
          },
        }),
        type: SkiaTopoStaticScene,
      }),
    );
    expect(element.props.children).not.toContainEqual(
      expect.objectContaining({
        type: SkiaTopoScene,
      }),
    );
  });
});
