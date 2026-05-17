import { createAnnotation, defaultColorForKind, isPathKind } from './annotationFactory';

describe('annotation factory', () => {
  it('creates marker annotations for stamp tools', () => {
    const annotation = createAnnotation({
      id: 'a1',
      topoId: 't1',
      photoId: 'p1',
      kind: 'bolt',
      point: { x: 0.25, y: 0.5 },
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(annotation.kind).toBe('bolt');
    expect('point' in annotation ? annotation.point : undefined).toEqual({ x: 0.25, y: 0.5 });
  });

  it('creates path annotations for line tools', () => {
    const annotation = createAnnotation({
      id: 'a2',
      topoId: 't1',
      photoId: 'p1',
      kind: 'climbLine',
      point: { x: 0.1, y: 0.2 },
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(isPathKind(annotation.kind)).toBe(true);
    expect('points' in annotation ? annotation.points : undefined).toEqual([{ x: 0.1, y: 0.2 }]);
  });

  it('uses a stable default color per annotation kind', () => {
    expect(defaultColorForKind('climbLine')).toBe('#C6F24F');
    expect(defaultColorForKind('walkoff')).toBe('#2F80ED');
    expect(defaultColorForKind('scramble')).toBe('#F2994A');
  });

  it('paints saved path annotations with the same color the draft preview uses', () => {
    const annotation = createAnnotation({
      id: 'a3',
      topoId: 't1',
      photoId: 'p1',
      kind: 'climbLine',
      point: { x: 0, y: 0 },
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(annotation.color).toBe(defaultColorForKind('climbLine'));
  });
});
