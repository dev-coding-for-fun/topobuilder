import type {
  Annotation,
  AnnotationKind,
  MarkerAnnotation,
  MarkerAnnotationKind,
  NormalizedPoint,
  PathAnnotation,
  PathAnnotationKind,
} from './types';
import { defaultAnnotationColourForTarget } from './annotationColours';
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

export function annotationsForPhoto(annotations: Annotation[], photoId?: string) {
  return annotations.filter((annotation) => annotation.photoId === photoId);
}

export function defaultColorForKind(kind: AnnotationKind) {
  switch (kind) {
    case 'climbLine':
      return '#C6F24F';
    case 'walkoff':
      return '#2F80ED';
    case 'scramble':
      return '#F2994A';
    case 'label':
      return defaultAnnotationColourForTarget('label');
    case 'anchor':
    case 'rappel':
      return '#9B51E0';
    case 'start':
      return '#27AE60';
    default:
      return '#EB5757';
  }
}

type CreateAnnotationInput = {
  id: string;
  topoId: string;
  photoId: string;
  routeId?: string;
  kind: AnnotationKind;
  point: NormalizedPoint;
  now: string;
  color?: string;
  label?: string;
  labelFontSize?: number;
};

export function createAnnotation(input: CreateAnnotationInput): Annotation {
  const base = {
    id: input.id,
    topoId: input.topoId,
    photoId: input.photoId,
    routeId: input.routeId,
    kind: input.kind,
    color: input.color ?? defaultColorForKind(input.kind),
    label: input.label,
    labelFontSize:
      input.kind === 'label'
        ? clampLabelFontSize(input.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE)
        : undefined,
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
