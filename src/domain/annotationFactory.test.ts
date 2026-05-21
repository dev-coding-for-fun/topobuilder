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
    expect(annotation.lineWeight).toBe('medium');
  });

  it('accepts explicit line weight for path annotations', () => {
    const annotation = createAnnotation({
      id: 'a7',
      topoId: 't1',
      photoId: 'p1',
      kind: 'walkoff',
      point: { x: 0.1, y: 0.2 },
      now: '2026-01-01T00:00:00.000Z',
      lineWeight: 'large',
    });

    expect(annotation.lineWeight).toBe('large');
  });

  it('uses a stable default color per annotation kind', () => {
    expect(defaultColorForKind('climbLine')).toBe('#FACC15');
    expect(defaultColorForKind('walkoff')).toBe('#FACC15');
    expect(defaultColorForKind('scramble')).toBe('#FACC15');
    expect(defaultColorForKind('bolt')).toBe('#FACC15');
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

  it('assigns label font size metadata to text annotations', () => {
    const annotation = createAnnotation({
      id: 'a4',
      topoId: 't1',
      photoId: 'p1',
      kind: 'label',
      point: { x: 0.25, y: 0.5 },
      now: '2026-01-01T00:00:00.000Z',
      label: 'Pitch 1',
      labelFontSize: 36,
    });

    expect(annotation.kind).toBe('label');
    expect(annotation.labelFontSize).toBe(36);
  });

  it('assigns medium stamp size by default and accepts explicit stamp size', () => {
    const defaultStamp = createAnnotation({
      id: 'a5',
      topoId: 't1',
      photoId: 'p1',
      kind: 'bolt',
      point: { x: 0.25, y: 0.5 },
      now: '2026-01-01T00:00:00.000Z',
    });
    const largeStamp = createAnnotation({
      id: 'a6',
      topoId: 't1',
      photoId: 'p1',
      kind: 'rappel',
      point: { x: 0.25, y: 0.5 },
      now: '2026-01-01T00:00:00.000Z',
      stampSize: 'large',
    });

    expect(defaultStamp.stampSize).toBe('medium');
    expect(largeStamp.stampSize).toBe('large');
  });
});
