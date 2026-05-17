import { denormalizePoint, fitContain, normalizePoint } from './geometry';

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
});
