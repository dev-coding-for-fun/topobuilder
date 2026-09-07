import { render } from '@testing-library/react-native';
import { Skia, useTypeface } from '@shopify/react-native-skia';

import { SKIA_INTER_FONT_BY_WEIGHT } from '@/rendering/skiaFontRegistry';
import type { SkiaTextTypefaces } from '@/rendering/SkiaTopoRenderer';

import { AnnotationShape } from './AnnotationShapes';

function mockSkiaInterFontsLoaded() {
  (useTypeface as jest.Mock).mockReturnValue('sk-typeface');
}

describe('AnnotationShape route lines', () => {
  it('renders missing line weight as medium thickness', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'line-1',
          topoId: 'topo-1',
          kind: 'climbLine',
          color: '#FACC15',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.8 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={1}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ color: '#FACC15' }).props.strokeWidth).toBe(5);
  });

  it('renders adjusted line weight thickness', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'line-1',
          topoId: 'topo-1',
          kind: 'climbLine',
          color: '#FACC15',
          lineWeight: 'large',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.8 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={1}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ color: '#FACC15' }).props.strokeWidth).toBe(7);
  });
});

describe('AnnotationShape route markers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSkiaInterFontsLoaded();
  });

  it('skips route marker label text until bundled Skia fonts have loaded', () => {
    (useTypeface as jest.Mock).mockReturnValue(null);

    const { UNSAFE_queryByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'start-1',
          topoId: 'topo-1',
          kind: 'start',
          color: '#FACC15',
          label: '12',
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={1}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_queryByProps({ text: '12' })).toBeNull();
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });

  it('uses black route marker text on light stamp colours', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'start-1',
          topoId: 'topo-1',
          kind: 'start',
          color: '#FACC15',
          label: '12',
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={1}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: '12' }).props.color).toBe('#111827');
  });

  it('uses white route marker text on dark stamp colours', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'start-1',
          topoId: 'topo-1',
          kind: 'start',
          color: '#1E3A8A',
          label: '12',
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={1}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: '12' }).props.color).toBe('#F8FAFC');
  });

  it('renders large circle stamp number text immediately when typefaces prop is supplied', () => {
    (useTypeface as jest.Mock).mockReturnValue(null);

    const typefaces = {
      '400': 'regular-typeface',
      '700': 'bold-typeface',
    } as unknown as SkiaTextTypefaces;

    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'start-1',
          topoId: 'topo-1',
          kind: 'start',
          color: '#FACC15',
          label: '1',
          point: { x: 0.5, y: 0.5 },
          stampSize: 'large',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={1}
        size={{ width: 1000, height: 1000 }}
        typefaces={typefaces}
      />,
    );

    expect(UNSAFE_getByProps({ text: '1' })).toBeTruthy();
    expect(Skia.Font).toHaveBeenCalledWith('bold-typeface', expect.any(Number));
  });
});

describe('AnnotationShape labels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSkiaInterFontsLoaded();
  });

  it('renders deselected labels using the editor image scale', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'label-1',
          topoId: 'topo-1',
          kind: 'label',
          color: '#111827',
          label: 'Pitch 1',
          labelFontSize: 80,
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={0.25}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font.fontSize).toBe(20);
  });

  it('uses the loaded Skia font for deselected editor labels when available', () => {
    const loadedFont = {
      fontSize: 20,
      measureText: jest.fn((text = '') => ({ width: String(text).length * 10 })),
    };
    (useTypeface as jest.Mock)
      .mockReturnValueOnce('regular-typeface')
      .mockReturnValueOnce('bold-typeface');
    (Skia.Font as jest.Mock).mockReturnValueOnce(loadedFont);

    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'label-1',
          topoId: 'topo-1',
          kind: 'label',
          color: '#111827',
          label: 'Pitch 1',
          labelFontSize: 80,
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={0.25}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font).toBe(loadedFont);
    expect(useTypeface).toHaveBeenCalledWith(SKIA_INTER_FONT_BY_WEIGHT['400']);
    expect(useTypeface).toHaveBeenCalledWith(SKIA_INTER_FONT_BY_WEIGHT['700']);
    expect(Skia.TypefaceFontProvider.Make).not.toHaveBeenCalled();
    expect(Skia.Font).toHaveBeenCalledWith('bold-typeface', 20);
  });

  it('skips deselected labels until bundled Skia fonts have loaded', () => {
    (useTypeface as jest.Mock).mockReturnValue(null);

    const { UNSAFE_queryByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'label-1',
          topoId: 'topo-1',
          kind: 'label',
          color: '#111827',
          label: 'Pitch 1',
          labelFontSize: 80,
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={0.25}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_queryByProps({ text: 'Pitch 1' })).toBeNull();
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });

  it('does not create a system font when bundled Skia fonts are unavailable', () => {
    const makeFont = Skia.Font as jest.Mock;
    (useTypeface as jest.Mock).mockReturnValue(null);

    render(
      <AnnotationShape
        annotation={{
          id: 'label-1',
          topoId: 'topo-1',
          kind: 'label',
          color: '#111827',
          label: 'Pitch 1',
          labelFontSize: 80,
          point: { x: 0.5, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
        imageScale={0.25}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(makeFont).not.toHaveBeenCalled();
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });
});
