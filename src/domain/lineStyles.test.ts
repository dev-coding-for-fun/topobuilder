import {
  DEFAULT_LINE_STYLE,
  LINE_STYLE_OPTIONS,
  defaultLineStyleForKind,
  isLineStyle,
  lineDashForStyle,
  lineStyleForAnnotation,
  lineStyleLabel,
} from './lineStyles';

describe('lineStyles domain', () => {
  it('validates supported line styles', () => {
    expect(isLineStyle('solid')).toBe(true);
    expect(isLineStyle('dashed')).toBe(true);
    expect(isLineStyle('dotted')).toBe(true);
    expect(isLineStyle('zigzag')).toBe(false);
    expect(isLineStyle(undefined)).toBe(false);
    expect(isLineStyle(null)).toBe(false);
  });

  it('exposes options and default', () => {
    expect(DEFAULT_LINE_STYLE).toBe('solid');
    expect(LINE_STYLE_OPTIONS).toEqual(['solid', 'dashed', 'dotted']);
  });

  it('provides default line styles for path kinds', () => {
    expect(defaultLineStyleForKind('climbLine')).toBe('solid');
    expect(defaultLineStyleForKind('scramble')).toBe('dashed');
    expect(defaultLineStyleForKind('walkoff')).toBe('dotted');
  });

  it('resolves line style for annotations', () => {
    expect(lineStyleForAnnotation({ kind: 'climbLine', lineStyle: 'dotted' })).toBe('dotted');
    expect(lineStyleForAnnotation({ kind: 'climbLine', lineStyle: 'dashed' })).toBe('dashed');
    expect(lineStyleForAnnotation({ kind: 'climbLine' })).toBe('solid');
    expect(lineStyleForAnnotation({ kind: 'scramble' })).toBe('dashed');
    expect(lineStyleForAnnotation({ kind: 'walkoff' })).toBe('dotted');
  });

  it('calculates dash intervals scaled by stroke width', () => {
    expect(lineDashForStyle('solid', 5)).toBeUndefined();
    expect(lineDashForStyle('dashed', 5)).toEqual([15, 8]);
    expect(lineDashForStyle('dotted', 5)).toEqual([0.1, 11]);
  });

  it('returns human-readable labels', () => {
    expect(lineStyleLabel('solid')).toBe('Solid');
    expect(lineStyleLabel('dashed')).toBe('Dashed');
    expect(lineStyleLabel('dotted')).toBe('Dots');
  });
});
