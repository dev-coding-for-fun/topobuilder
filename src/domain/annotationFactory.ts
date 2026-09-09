import type {
  Annotation,
  AnnotationKind,
  MarkerAnnotation,
  MarkerAnnotationKind,
  NormalizedPoint,
  PathAnnotation,
  PathAnnotationKind,
} from './types';
import { defaultAnnotationColourForTarget, type StampAnnotationKind } from './annotationColours';
import { defaultLineStyleForKind, type LineStyle } from './lineStyles';
import { DEFAULT_LINE_WEIGHT, type LineWeight } from './lineWeights';
import { DEFAULT_STAMP_SIZE, type StampSize } from './stampSizes';
import { DEFAULT_LABEL_FONT_SIZE, clampLabelFontSize } from './textLabels';

const pathKinds = new Set<AnnotationKind>(['climbLine', 'walkoff', 'scramble']);

export function isPathKind(kind: AnnotationKind): kind is PathAnnotationKind {
  return pathKinds.has(kind);
}

export function isMarkerKind(kind: AnnotationKind): kind is MarkerAnnotationKind {
  return !isPathKind(kind);
}

export function isPathAnnotation(annotation: Annotation): annotation is PathAnnotation {
  return isPathKind(annotation.kind);
}

export function isMarkerAnnotation(annotation: Annotation): annotation is MarkerAnnotation {
  return isMarkerKind(annotation.kind);
}

export function isLabelAnnotation(annotation: Annotation): annotation is MarkerAnnotation {
  return isMarkerAnnotation(annotation) && annotation.kind === 'label';
}

export function isStampKind(kind: AnnotationKind): kind is StampAnnotationKind {
  return kind === 'bolt' || kind === 'rappel' || kind === 'belay' || kind === 'start';
}

export function isStampAnnotation(annotation: Annotation): annotation is MarkerAnnotation & { kind: StampAnnotationKind } {
  return isMarkerAnnotation(annotation) && isStampKind(annotation.kind);
}

/**
 * Filter annotations down to those belonging to a given topo. Retained under
 * the historical `annotationsForPhoto` name (and `annotationsForTopo` alias)
 * so the editor's call sites do not all have to be renamed at once. A topo's
 * id is also the identity of its photo, so the two names mean the same thing.
 */
export function annotationsForTopo(annotations: Annotation[], topoId?: string) {
  if (!topoId) return [];
  return annotations.filter((annotation) => annotation.topoId === topoId);
}

export const annotationsForPhoto = annotationsForTopo;

export function defaultColorForKind(kind: AnnotationKind) {
  switch (kind) {
    case 'climbLine':
    case 'walkoff':
    case 'scramble':
      return defaultAnnotationColourForTarget('line');
    case 'label':
      return defaultAnnotationColourForTarget('label');
    case 'anchor':
    case 'arrow':
      return '#EB5757';
    case 'belay':
    case 'bolt':
    case 'rappel':
    case 'start':
      return defaultAnnotationColourForTarget(kind);
  }
}

type CreateAnnotationInput = {
  id: string;
  topoId: string;
  routeId?: string;
  kind: AnnotationKind;
  point: NormalizedPoint;
  now: string;
  color?: string;
  label?: string;
  labelFontSize?: number;
  lineWeight?: LineWeight;
  lineStyle?: LineStyle;
  stampSize?: StampSize;
};

export function createAnnotation(input: CreateAnnotationInput): Annotation {
  const base = {
    id: input.id,
    topoId: input.topoId,
    routeId: input.routeId,
    kind: input.kind,
    color: input.color ?? defaultColorForKind(input.kind),
    label: input.label,
    labelFontSize:
      input.kind === 'label'
        ? clampLabelFontSize(input.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE)
        : undefined,
    lineWeight: isPathKind(input.kind) ? (input.lineWeight ?? DEFAULT_LINE_WEIGHT) : undefined,
    lineStyle: isPathKind(input.kind) ? (input.lineStyle ?? defaultLineStyleForKind(input.kind)) : undefined,
    stampSize: isStampKind(input.kind) ? (input.stampSize ?? DEFAULT_STAMP_SIZE) : undefined,
    createdAt: input.now,
    updatedAt: input.now,
  };

  if (isPathKind(input.kind)) {
    return {
      ...base,
      kind: input.kind,
      points: [input.point],
    };
  }

  return {
    ...base,
    kind: input.kind,
    point: input.point,
  };
}
