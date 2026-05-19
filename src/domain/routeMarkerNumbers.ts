import { isStampAnnotation } from './annotationFactory';
import type { Annotation } from './types';

export type RouteMarkerNumber = number | null;

const MIN_ROUTE_MARKER_NUMBER = 1;
const MAX_ROUTE_MARKER_NUMBER = 99;

export function parseRouteMarkerNumber(label?: string): RouteMarkerNumber | undefined {
  const trimmed = label?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }

  if (!/^\d{1,2}$/.test(trimmed)) {
    return undefined;
  }

  const value = Number(trimmed);
  if (value < MIN_ROUTE_MARKER_NUMBER || value > MAX_ROUTE_MARKER_NUMBER) {
    return undefined;
  }

  return value;
}

export function routeMarkerNumberLabel(value: RouteMarkerNumber) {
  return value === null ? undefined : String(value);
}

export function incrementRouteMarkerNumber(value: RouteMarkerNumber): RouteMarkerNumber {
  if (value === null) {
    return MIN_ROUTE_MARKER_NUMBER;
  }

  return value >= MAX_ROUTE_MARKER_NUMBER ? null : value + 1;
}

export function decrementRouteMarkerNumber(value: RouteMarkerNumber): RouteMarkerNumber {
  if (value === null) {
    return MAX_ROUTE_MARKER_NUMBER;
  }

  return value <= MIN_ROUTE_MARKER_NUMBER ? null : value - 1;
}

export function usedRouteMarkerNumbers(annotations: Annotation[]) {
  const used = new Set<number>();
  for (const annotation of annotations) {
    if (!isStampAnnotation(annotation) || annotation.kind !== 'start') {
      continue;
    }

    const number = parseRouteMarkerNumber(annotation.label);
    if (typeof number === 'number') {
      used.add(number);
    }
  }
  return used;
}

export function nextUnusedRouteMarkerNumber(
  annotations: Annotation[],
  startAt: RouteMarkerNumber = MIN_ROUTE_MARKER_NUMBER,
): RouteMarkerNumber {
  const used = usedRouteMarkerNumbers(annotations);
  const start = startAt ?? MIN_ROUTE_MARKER_NUMBER;

  for (let number = start; number <= MAX_ROUTE_MARKER_NUMBER; number += 1) {
    if (!used.has(number)) {
      return number;
    }
  }

  return null;
}
