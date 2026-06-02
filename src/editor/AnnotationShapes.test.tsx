import { render } from '@testing-library/react-native';
import { Skia, matchFont, useFont } from '@shopify/react-native-skia';

import { AnnotationShape } from './AnnotationShapes';

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
        routeMarkerFont={null}
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
        routeMarkerFont={null}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ color: '#FACC15' }).props.strokeWidth).toBe(7);
  });
});

describe('AnnotationShape route markers', () => {
  beforeEach(() => {
    (useFont as jest.Mock).mockImplementation((_source: unknown, fontSize = 16) => ({
      fontSize,
      measureText: jest.fn((text = '') => ({ width: String(text).length * fontSize * 0.5 })),
    }));
  });

  it('renders route marker label text even when the async font has not loaded', () => {
    (useFont as jest.Mock).mockReturnValueOnce(null);

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
        routeMarkerFont={null}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: '12' })).toBeTruthy();
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
        routeMarkerFont={null}
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
        routeMarkerFont={null}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: '12' }).props.color).toBe('#F8FAFC');
  });
});

describe('AnnotationShape labels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFont as jest.Mock).mockImplementation((_source: unknown, fontSize = 16) => ({
      fontSize,
      measureText: jest.fn((text = '') => ({ width: String(text).length * fontSize * 0.5 })),
    }));
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
        routeMarkerFont={null}
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
    const fallbackFont = {
      fontSize: 20,
      measureText: jest.fn((text = '') => ({ width: String(text).length * 10 })),
    };
    (useFont as jest.Mock).mockReturnValueOnce(loadedFont);
    (matchFont as jest.Mock).mockReturnValueOnce(fallbackFont);

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
        routeMarkerFont={null}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font).toBe(loadedFont);
  });

  it('falls back to a plain Skia font for deselected labels when the loaded font is unavailable', () => {
    const makeFont = Skia.Font as jest.Mock;
    (useFont as jest.Mock).mockReturnValueOnce(null);

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
        routeMarkerFont={null}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(matchFont).not.toHaveBeenCalled();
    expect(makeFont).toHaveBeenCalledWith(expect.anything(), 20);
    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font.fontSize).toBe(20);
  });

  it('does not pass a null system typeface into Skia.Font on web', () => {
    const systemFontMgr = Skia.FontMgr.System as jest.Mock;
    const makeFont = Skia.Font as jest.Mock;
    systemFontMgr.mockReturnValueOnce({
      matchFamilyStyle: jest.fn(() => null),
    });
    makeFont.mockImplementation((typeface, fontSize) => {
      return {
        fontTypeface: typeface,
        fontSize,
        measureText: jest.fn(() => ({ width: 0 })),
        setEmbolden: jest.fn(),
      };
    });

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
        routeMarkerFont={null}
        size={{ width: 1000, height: 1000 }}
      />,
    );

    expect(makeFont).not.toHaveBeenCalledWith(null, expect.any(Number));
  });
});
