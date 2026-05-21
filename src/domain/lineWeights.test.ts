import {
  DEFAULT_LINE_WEIGHT,
  LINE_WEIGHT_OPTIONS,
  isLineWeight,
  lineStrokeWidthForWeight,
  lineWeightForAnnotation,
  pdfLineStrokeWidthForWeight,
} from './lineWeights';

describe('line weight helpers', () => {
  it('defines three line weights with medium as the default', () => {
    expect(LINE_WEIGHT_OPTIONS).toEqual(['small', 'medium', 'large']);
    expect(DEFAULT_LINE_WEIGHT).toBe('medium');
  });

  it('validates persisted line weight values', () => {
    expect(isLineWeight('small')).toBe(true);
    expect(isLineWeight('medium')).toBe(true);
    expect(isLineWeight('large')).toBe(true);
    expect(isLineWeight('extra-large')).toBe(false);
  });

  it('maps missing weight to medium stroke widths', () => {
    expect(lineWeightForAnnotation({})).toBe('medium');
    expect(lineStrokeWidthForWeight(lineWeightForAnnotation({}))).toBe(5);
    expect(pdfLineStrokeWidthForWeight(lineWeightForAnnotation({}))).toBe(8);
  });

  it('maps small and large weights around the medium thickness', () => {
    expect(lineStrokeWidthForWeight('small')).toBeLessThan(lineStrokeWidthForWeight('medium'));
    expect(lineStrokeWidthForWeight('large')).toBeGreaterThan(lineStrokeWidthForWeight('medium'));
    expect(pdfLineStrokeWidthForWeight('small')).toBeLessThan(pdfLineStrokeWidthForWeight('medium'));
    expect(pdfLineStrokeWidthForWeight('large')).toBeGreaterThan(pdfLineStrokeWidthForWeight('medium'));
  });
});
