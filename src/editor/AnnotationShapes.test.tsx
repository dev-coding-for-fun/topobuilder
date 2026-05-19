import { render } from '@testing-library/react-native';

import { AnnotationShape } from './AnnotationShapes';

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
