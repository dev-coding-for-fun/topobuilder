import {
  appendSampledPoint,
  canMoveControlPoint,
  clampPan,
  denormalizePoint,
  finalizeSampledPoints,
  findNearestPointIndex,
  findNearestPolylineSegment,
  fitContain,
  fitCover,
  insertControlPoint,
  minContainScale,
  moveControlPoint,
  normalizePoint,
  normalizedToScreenPoint,
  projectPointOntoSegment,
  screenToNormalizedImagePoint,
  screenToImagePoint,
} from './geometry';

describe('geometry helpers', () => {
  it('normalizes and denormalizes image points', () => {
    const normalized = normalizePoint({ x: 300, y: 200 }, { width: 600, height: 400 });

    expect(normalized).toEqual({ x: 0.5, y: 0.5 });
    expect(denormalizePoint(normalized, { width: 600, height: 400 })).toEqual({ x: 300, y: 200 });
  });

  it('clamps normalized points to the image bounds', () => {
    expect(normalizePoint({ x: 700, y: -20 }, { width: 600, height: 400 })).toEqual({
      x: 1,
      y: 0,
    });
  });

  it('fits a source image inside a target frame', () => {
    expect(fitContain({ width: 1000, height: 500 }, { width: 300, height: 300 })).toMatchObject({
      width: 300,
      height: 150,
      offsetY: 75,
    });
  });

  it('covers a target frame with the source image, bleeding off the long axis', () => {
    expect(fitCover({ width: 1000, height: 500 }, { width: 300, height: 300 })).toMatchObject({
      width: 600,
      height: 300,
      offsetX: -150,
      offsetY: 0,
    });
  });

  it('maps a tap in the visible canvas back to source-image pixels in cover mode', () => {
    expect(
      screenToImagePoint(
        { x: 150, y: 150 },
        { width: 1000, height: 500 },
        { width: 300, height: 300 },
        'cover',
      ),
    ).toEqual({ x: 500, y: 250 });
  });

  it('maps between screen and normalized image points with pan and zoom', () => {
    const base = fitCover({ width: 1000, height: 500 }, { width: 300, height: 300 });
    const transform = { scale: 2, tx: -20, ty: 10 };
    const normalized = { x: 0.25, y: 0.5 };
    const screen = normalizedToScreenPoint(normalized, base, transform);

    expect(screenToNormalizedImagePoint(screen, base, transform)).toEqual(normalized);
  });

  describe('polyline sampling', () => {
    const size = { width: 300, height: 300 };
    const minDistance = 44;

    it('keeps sampled points at touch-friendly spacing', () => {
      const first = appendSampledPoint([], { x: 0.1, y: 0.1 }, size, minDistance);
      const tooClose = appendSampledPoint(first, { x: 0.2, y: 0.1 }, size, minDistance);
      const farEnough = appendSampledPoint(tooClose, { x: 0.3, y: 0.1 }, size, minDistance);

      expect(tooClose).toHaveLength(1);
      expect(farEnough).toEqual([
        { x: 0.1, y: 0.1 },
        { x: 0.3, y: 0.1 },
      ]);
    });

    it('preserves the final stroke point by replacing a nearby last sample', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0.7, y: 0 },
      ];

      expect(finalizeSampledPoints(points, { x: 0.72, y: 0 }, size, minDistance)).toEqual([
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0.72, y: 0 },
      ]);
    });
  });

  describe('polyline hit testing and control point spacing', () => {
    const size = { width: 300, height: 300 };
    const points = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.8, y: 0.4 },
    ];

    it('finds the nearest control point inside a tolerance', () => {
      expect(findNearestPointIndex(points, { x: 0.51, y: 0.1 }, size, 12)).toMatchObject({
        index: 1,
      });
      expect(findNearestPointIndex(points, { x: 0.51, y: 0.1 }, size, 2)).toBeUndefined();
    });

    it('finds the nearest polyline segment inside a tolerance', () => {
      expect(findNearestPolylineSegment(points, { x: 0.3, y: 0.12 }, size, 12)).toMatchObject({
        index: 0,
      });
      expect(findNearestPolylineSegment(points, { x: 0.3, y: 0.3 }, size, 12)).toBeUndefined();
    });

    it('rejects control point moves that crowd neighboring points', () => {
      expect(canMoveControlPoint(points, 1, { x: 0.11, y: 0.1 }, size, 44)).toBe(false);
      expect(moveControlPoint(points, 1, { x: 0.6, y: 0.15 }, size, 44)).toEqual([
        { x: 0.1, y: 0.1 },
        { x: 0.6, y: 0.15 },
        { x: 0.8, y: 0.4 },
      ]);
    });
  });

  describe('clampPan', () => {
    const canvas = { width: 300, height: 300 };
    // Wide photo → at cover (user scale = 1) it bleeds horizontally and fills vertically.
    const base = fitCover({ width: 1000, height: 500 }, canvas);

    it('locks the constrained axis to zero at cover scale', () => {
      const clamped = clampPan({ x: 0, y: 100 }, 1, base, canvas);
      expect(clamped.x).toBeCloseTo(0);
      expect(clamped.y).toBeCloseTo(0);
    });

    it('allows symmetric panning on the cropped axis at cover scale', () => {
      expect(clampPan({ x: 1000, y: 0 }, 1, base, canvas).x).toBeCloseTo(150);
      expect(clampPan({ x: -1000, y: 0 }, 1, base, canvas).x).toBeCloseTo(-150);
    });

    it('opens up vertical travel when zoomed in past cover', () => {
      const farUp = clampPan({ x: 0, y: -9999 }, 2, base, canvas);
      expect(farUp.y).toBeCloseTo(-300);
      const farDown = clampPan({ x: 0, y: 9999 }, 2, base, canvas);
      expect(farDown.y).toBeCloseTo(0);
    });

    it('auto-centers when zoomed out below cover on an axis smaller than the canvas', () => {
      // Wide photo at user scale 0.5 = contain-fit: rendered 300x150, letterboxed top/bottom.
      // The image sits at canvas (-75 + tx, 0 + ty) → (225 + tx, 150 + ty) with no translation.
      // Centering requires tx = ty = 75 so the rendered box lands at (0,75)→(300,225).
      const centered = clampPan({ x: 9999, y: 9999 }, 0.5, base, canvas);
      expect(centered.x).toBeCloseTo(75);
      expect(centered.y).toBeCloseTo(75);

      // Same result no matter what translation the user requested.
      const fromFar = clampPan({ x: -9999, y: -9999 }, 0.5, base, canvas);
      expect(fromFar.x).toBeCloseTo(75);
      expect(fromFar.y).toBeCloseTo(75);
    });

    it('returns the translation untouched when canvas is degenerate', () => {
      expect(clampPan({ x: 42, y: 9 }, 1, base, { width: 0, height: 0 })).toEqual({
        x: 42,
        y: 9,
      });
    });
  });

  describe('minContainScale', () => {
    it('is 1 for an aspect-matching photo (cover equals contain)', () => {
      expect(minContainScale({ width: 500, height: 500 }, { width: 300, height: 300 })).toBeCloseTo(1);
    });

    it('returns the contain/cover ratio for off-aspect photos', () => {
      // Wide photo: cover scales by height (0.6), contain scales by width (0.3) → ratio 0.5.
      expect(minContainScale({ width: 1000, height: 500 }, { width: 300, height: 300 })).toBeCloseTo(0.5);
    });

    it('defaults to 1 for degenerate sizes', () => {
      expect(minContainScale({ width: 0, height: 0 }, { width: 300, height: 300 })).toBe(1);
      expect(minContainScale({ width: 1000, height: 500 }, { width: 0, height: 0 })).toBe(1);
    });
  });

  describe('projectPointOntoSegment', () => {
    const size = { width: 1000, height: 1000 };
    const start = { x: 0.1, y: 0.2 };
    const end = { x: 0.9, y: 0.2 };

    it('projects a point directly above or below the segment onto the horizontal line', () => {
      const projected = projectPointOntoSegment({ x: 0.5, y: 0.25 }, start, end, size);
      expect(projected.x).toBeCloseTo(0.5);
      expect(projected.y).toBeCloseTo(0.2);
    });

    it('clamps to the start endpoint if the point is beyond the start', () => {
      const projected = projectPointOntoSegment({ x: 0.05, y: 0.2 }, start, end, size);
      expect(projected.x).toBeCloseTo(0.1);
      expect(projected.y).toBeCloseTo(0.2);
    });

    it('clamps to the end endpoint if the point is beyond the end', () => {
      const projected = projectPointOntoSegment({ x: 0.95, y: 0.2 }, start, end, size);
      expect(projected.x).toBeCloseTo(0.9);
      expect(projected.y).toBeCloseTo(0.2);
    });
  });

  describe('insertControlPoint', () => {
    const points = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.9 },
    ];

    it('inserts a new point between existing points at segmentIndex', () => {
      const newPoint = { x: 0.3, y: 0.3 };
      const updated = insertControlPoint(points, 0, newPoint);
      expect(updated).toEqual([
        { x: 0.1, y: 0.1 },
        { x: 0.3, y: 0.3 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.9 },
      ]);
    });

    it('inserts a point into the second segment', () => {
      const newPoint = { x: 0.7, y: 0.7 };
      const updated = insertControlPoint(points, 1, newPoint);
      expect(updated).toEqual([
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.7, y: 0.7 },
        { x: 0.9, y: 0.9 },
      ]);
    });

    it('returns original points if segmentIndex is out of range', () => {
      expect(insertControlPoint(points, -1, { x: 0.2, y: 0.2 })).toBe(points);
      expect(insertControlPoint(points, 2, { x: 0.2, y: 0.2 })).toBe(points);
    });
  });
});

