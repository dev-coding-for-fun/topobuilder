export type ID = string;

export type NormalizedPoint = {
  x: number;
  y: number;
};

export type AnnotationKind =
  | 'bolt'
  | 'anchor'
  | 'belay'
  | 'rappel'
  | 'start'
  | 'label'
  | 'arrow'
  | 'climbLine'
  | 'walkoff'
  | 'scramble';

export type MarkerAnnotationKind = Extract<
  AnnotationKind,
  'bolt' | 'anchor' | 'belay' | 'rappel' | 'start' | 'label' | 'arrow'
>;

export type PathAnnotationKind = Extract<
  AnnotationKind,
  'climbLine' | 'walkoff' | 'scramble'
>;

export type Route = {
  id: ID;
  topoId: ID;
  name: string;
  grade?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type PhotoAsset = {
  id: ID;
  topoId: ID;
  uri: string;
  width: number;
  height: number;
  createdAt: string;
};

export type BaseAnnotation = {
  id: ID;
  topoId: ID;
  photoId: ID;
  routeId?: ID;
  kind: AnnotationKind;
  color: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
};

export type MarkerAnnotation = BaseAnnotation & {
  kind: MarkerAnnotationKind;
  point: NormalizedPoint;
};

export type PathAnnotation = BaseAnnotation & {
  kind: PathAnnotationKind;
  points: NormalizedPoint[];
};

export type Annotation = MarkerAnnotation | PathAnnotation;

export type TopoProject = {
  id: ID;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  photos: PhotoAsset[];
  routes: Route[];
  annotations: Annotation[];
};

export type TopoSummary = Pick<
  TopoProject,
  'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'
> & {
  photoCount: number;
  routeCount: number;
};

export type EditorTool = AnnotationKind | 'select';
