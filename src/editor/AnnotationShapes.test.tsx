import { render } from '@testing-library/react-native';
import { Skia, useTypeface } from '@shopify/react-native-skia';

import { SKIA_INTER_FONT_BY_WEIGHT } from '@/rendering/skiaFontRegistry';
import type { SkiaTextTypefaces } from '@/rendering/SkiaTopoRenderer';

import { AnnotationShape, SelectedPathHandles } from './AnnotationShapes';

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

describe('SelectedPathHandles', () => {
  const points = [
    { x: 0.2, y: 0.3 },
    { x: 0.6, y: 0.7 },
  ];
  const size = { width: 1000, height: 1000 };

  it('renders handles with standard radii at default scale (scale=1)', () => {
    const { UNSAFE_getAllByProps } = render(
      <SelectedPathHandles points={points} size={size} />,
    );

    const outerCircles = UNSAFE_getAllByProps({ color: '#0F172A' });
    const middleCircles = UNSAFE_getAllByProps({ color: '#F8FAFC' });
    const innerCircles = UNSAFE_getAllByProps({ color: '#1D4ED8' });

    expect(outerCircles).toHaveLength(2);
    expect(middleCircles).toHaveLength(2);
    expect(innerCircles).toHaveLength(2);

    expect(outerCircles[0].props.r).toBe(12);
    expect(middleCircles[0].props.r).toBe(9);
    expect(innerCircles[0].props.r).toBe(5);
  });

  it('inversely scales radii when zoomed in (scale=2) so handles remain the same size on screen', () => {
    const { UNSAFE_getAllByProps } = render(
      <SelectedPathHandles points={points} scale={2} size={size} />,
    );

    const outerCircles = UNSAFE_getAllByProps({ color: '#0F172A' });
    const middleCircles = UNSAFE_getAllByProps({ color: '#F8FAFC' });
    const innerCircles = UNSAFE_getAllByProps({ color: '#1D4ED8' });

    expect(outerCircles[0].props.r).toBe(6);
    expect(middleCircles[0].props.r).toBe(4.5);
    expect(innerCircles[0].props.r).toBe(2.5);
  });

  it('inversely scales radii when scale is a SharedValue', () => {
    const scaleSharedValue = { value: 3 } as unknown as import('react-native-reanimated').SharedValue<number>;
    const { UNSAFE_getAllByProps } = render(
      <SelectedPathHandles points={points} scale={scaleSharedValue} size={size} />,
    );

    const outerCircles = UNSAFE_getAllByProps({ color: '#0F172A' });
    const middleCircles = UNSAFE_getAllByProps({ color: '#F8FAFC' });
    const innerCircles = UNSAFE_getAllByProps({ color: '#1D4ED8' });

    expect(outerCircles[0].props.r).toBe(4);
    expect(middleCircles[0].props.r).toBe(3);
    expect(innerCircles[0].props.r).toBeCloseTo(5 / 3);
  });
});
