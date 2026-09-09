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

/** Top-level container. A crag (or mountain, area) houses one or more sectors. */
export type Crag = {
  id: ID;
  name: string;
  description?: string;
  sortOrder: number;
  tabvarCragId?: number;
  createdAt: string;
  updatedAt: string;
};

/** Mid-level grouping. Every topo lives inside a sector; every crag has at least one. */
export type Sector = {
  id: ID;
  cragId: ID;
  name: string;
  description?: string;
  sortOrder: number;
  tabvarSectorId?: number;
  createdAt: string;
  updatedAt: string;
};

/** Leaf entity: one annotated image. The photo lives on the topo. */
export type Topo = {
  id: ID;
  sectorId: ID;
  name: string;
  description?: string;
  photoUri?: string;
  photoWidth?: number;
  photoHeight?: number;
  tabvarDirty: boolean;
  tabvarSubmissionId?: string;
  tabvarSyncedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RouteType = 'sport' | 'trad' | 'mixed' | 'boulder' | 'aid' | 'top-rope';

export type Route = {
  id: ID;
  topoId: ID;
  name: string;
  grade?: string;
  routeType?: RouteType;
  boltCount?: number;
  lengthM?: number;
  fa?: string;
  description?: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** A connected route from the external TABVAR catalog. */
export type TabvarRoute = {
  id: number;
  appId: string;
  cragId: number;
  sectorId: number;
  name: string;
  altNames?: string;
  gradeYds?: string;
  status?: string;
  boltCount?: number;
  pitchCount?: number;
  routeLength?: number;
  climbStyle?: string;
  cragName?: string;
  sectorName?: string;
  sortOrder?: number;
};

export type ConnectedTopoRoute = {
  topoId: ID;
  routeAppId: string;
  sortOrder: number;
  createdAt: string;
  route: TabvarRoute;
};

export type BaseAnnotation = {
  id: ID;
  /** A topo's id is also the photo's id; annotations belong to exactly one topo. */
  topoId: ID;
  routeId?: ID;
  routeAppId?: string;
  kind: AnnotationKind;
  color: string;
  label?: string;
  labelFontSize?: number;
  lineWeight?: 'small' | 'medium' | 'large';
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  stampSize?: 'small' | 'medium' | 'large';
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

/** Summary row used by the Crags list. */
export type CragSummary = {
  id: ID;
  name: string;
  description?: string;
  sortOrder: number;
  tabvarCragId?: number;
  createdAt: string;
  updatedAt: string;
  sectorCount: number;
  topoCount: number;
};

/** Connected catalog crag from an external source like TABVAR. */
export type ConnectedCragSummary = {
  tabvarCragId: number;
  name: string;
  notes?: string;
  sectorCount: number;
  routeCount: number;
  workspaceCragId?: string;
  topoCount: number;
};

/** Topo with its routes pre-loaded; used by the Crag detail cards and Topo info sheet. */
export type TopoWithRoutes = Topo & {
  routes: Route[];
  tabvarRoutes?: TabvarRoute[];
};

export type SectorWithTopos = Sector & {
  topos: TopoWithRoutes[];
  unmappedRoutes?: TabvarRoute[];
};

export type CragDetail = {
  crag: Crag;
  sectors: SectorWithTopos[];
};

/** Bundle the editor needs in one shot: the topo, its routes, and its annotations. */
export type TopoEditorBundle = {
  topo: Topo;
  routes: Route[];
  annotations: Annotation[];
};

export type EditorTool = AnnotationKind | 'select';

// ── Legacy/structural shapes used by the rendering and export layers ──────
//
// The rendering and PDF export pipelines were authored against the v0
// `TopoProject` / `PhotoAsset` shapes. Rather than rewrite that pipeline as
// part of this restructure, we keep these names available as structural
// types — the renderer doesn't care about persistence, only about shape.

/** Structural shape the renderer expects for a photo asset. */
export type PhotoAsset = {
  id: ID;
  topoId: ID;
  uri: string;
  width: number;
  height: number;
  createdAt: string;
};

/** Structural shape the renderer expects for a topo project bundle. */
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

export type GuidebookTopo = Topo & {
  annotations: Annotation[];
  photo?: PhotoAsset;
  routes: Route[];
  tabvarRoutes?: TabvarRoute[];
};

export type GuidebookSector = Sector & {
  topos: GuidebookTopo[];
};

export type GuidebookCrag = Crag & {
  sectors: GuidebookSector[];
};

export type GuidebookExportScope = 'crag' | 'sector' | 'topo';

export type GuidebookExportRequest =
  | { kind: 'crag'; cragId: ID }
  | { kind: 'sector'; sectorId: ID }
  | { kind: 'topo'; topoId: ID };

export type GuidebookExportBundle = {
  crag: GuidebookCrag;
  scope: GuidebookExportScope;
  selectedSectorId?: ID;
  selectedTopoId?: ID;
};
