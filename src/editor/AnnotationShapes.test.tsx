import { render } from '@testing-library/react-native';

import { AnnotationShape } from './AnnotationShapes';

describe('AnnotationShape route lines', () => {
  it('renders missing line weight as medium thickness', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'line-1',
          topoId: 'topo-1',
          photoId: 'photo-1',
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
          photoId: 'photo-1',
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
  it('renders route marker label text even when the async font has not loaded', () => {
    const { UNSAFE_getByProps } = render(
      <AnnotationShape
        annotation={{
          id: 'start-1',
          topoId: 'topo-1',
          photoId: 'photo-1',
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
          photoId: 'photo-1',
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
          photoId: 'photo-1',
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
