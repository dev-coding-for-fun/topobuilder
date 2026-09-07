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

  it('includes route footer below the topo image when includeRoutes is true', async () => {
    const projectWithRoutes: TopoProject = {
      ...project,
      routes: [
        {
          color: '#DC2626',
          createdAt: '2026-01-01T00:00:00.000Z',
          grade: '5.10a',
          id: 'route-1',
          name: 'First Climb',
          sortOrder: 1,
          topoId: project.id,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    await renderTopoRasterBase64(projectWithRoutes, projectWithRoutes.photos[0], {
      format: ImageFormat.WEBP,
      includeRoutes: true,
      targetWidth: 1000,
    });

    const calls = (drawAsImage as jest.Mock).mock.calls;
    const [element, size] = calls[calls.length - 1];
    expect(size.width).toBe(1000);
    // Height should be photo height (800) + footer height (> 0)
    expect(size.height).toBeGreaterThan(800);

    const staticScene = element.props.children.find(
      (child: any) => child?.type === SkiaTopoStaticScene,
    );
    expect(staticScene.props.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'footer-background' }),
        expect.objectContaining({ id: 'footer-top-divider' }),
        expect.objectContaining({ id: 'footer-route-route-1-name', text: 'First Climb' }),
      ]),
    );
  });
});
