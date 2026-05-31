import type { Annotation } from './types';
import {
  decrementRouteMarkerNumber,
  incrementRouteMarkerNumber,
  nextUnusedRouteMarkerNumber,
  parseRouteMarkerNumber,
  routeMarkerNumberLabel,
  usedRouteMarkerNumbers,
} from './routeMarkerNumbers';

function marker(id: string, label?: string): Annotation {
  return {
    id,
    topoId: 'topo-1',
    kind: 'start',
    color: '#FACC15',
    label,
    point: { x: 0.5, y: 0.5 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('route marker numbers', () => {
  it('parses blank and valid labels', () => {
    expect(parseRouteMarkerNumber(undefined)).toBeNull();
    expect(parseRouteMarkerNumber('')).toBeNull();
    expect(parseRouteMarkerNumber(' 7 ')).toBe(7);
    expect(parseRouteMarkerNumber('99')).toBe(99);
  });

  it('rejects invalid or out-of-range labels', () => {
    expect(parseRouteMarkerNumber('0')).toBeUndefined();
    expect(parseRouteMarkerNumber('100')).toBeUndefined();
    expect(parseRouteMarkerNumber('A1')).toBeUndefined();
  });

  it('formats blank values as absent labels', () => {
    expect(routeMarkerNumberLabel(null)).toBeUndefined();
    expect(routeMarkerNumberLabel(12)).toBe('12');
  });

  it('cycles increment and decrement through blank', () => {
    expect(incrementRouteMarkerNumber(null)).toBe(1);
    expect(incrementRouteMarkerNumber(99)).toBeNull();
    expect(decrementRouteMarkerNumber(null)).toBe(99);
    expect(decrementRouteMarkerNumber(1)).toBeNull();
  });

  it('collects used route marker numbers and ignores blanks and duplicates', () => {
    expect(usedRouteMarkerNumbers([marker('one', '7'), marker('two', '7'), marker('blank')])).toEqual(
      new Set([7]),
    );
  });

  it('finds the next unused number from the requested start', () => {
    expect(nextUnusedRouteMarkerNumber([marker('one', '1'), marker('two', '2'), marker('seven', '7')], 3)).toBe(3);
    expect(nextUnusedRouteMarkerNumber([marker('seven', '7')], 7)).toBe(8);
  });

  it('returns blank when all numbers are taken', () => {
    const markers = Array.from({ length: 99 }, (_, index) => marker(String(index + 1), String(index + 1)));

    expect(nextUnusedRouteMarkerNumber(markers)).toBeNull();
  });
});
