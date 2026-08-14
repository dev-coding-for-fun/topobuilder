export type TabvarSession = {
  tabvarUserId: string;
  accessToken: string;
  connectedAt: string;
  displayName?: string;
  email?: string;
  expiresAt?: string;
  refreshToken?: string;
};

export type TabvarConnectResponse = {
  token?: string;
  user?: {
    uid?: string;
    displayName?: string;
    email?: string;
    role?: string;
  };
};

export type TabvarSubmissionKind = 'crag' | 'sector' | 'topo';

export type TabvarSubmissionRoute = {
  name: string;
  gradeYds?: string;
};

export type TabvarSubmissionTopo = {
  fileKey: string;
  routeRefs: string[];
};

export type TabvarCragSubmission = {
  kind: 'crag';
  crag: {
    name: string;
  };
  sectors: {
    name: string;
    routes: TabvarSubmissionRoute[];
    topos: TabvarSubmissionTopo[];
  }[];
};

export type TabvarSectorSubmission = {
  kind: 'sector';
  sector: {
    name: string;
    cragName: string;
  };
  routes: TabvarSubmissionRoute[];
  topos: TabvarSubmissionTopo[];
};

export type TabvarTopoSubmission = {
  kind: 'topo';
  topo: TabvarSubmissionTopo & {
    cragName: string;
    sectorName: string;
  };
  routes: TabvarSubmissionRoute[];
};

export type TabvarSubmission =
  | TabvarCragSubmission
  | TabvarSectorSubmission
  | TabvarTopoSubmission;

export type TabvarSubmissionImage = {
  fileKey: string;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  topoId: string;
  uri: string;
};

export type BuiltTabvarSubmission = {
  images: TabvarSubmissionImage[];
  submission: TabvarSubmission;
  topoIds: string[];
};

export type TabvarSubmissionResponse = {
  id: string;
  status: string;
};

export type TabvarCatalogAttachment = {
  id: number;
  url?: string;
  name?: string;
  type?: string;
};

export type TabvarIssueAttachment = {
  id: number;
  url: string;
  name: string;
  type: string;
};

export type TabvarIssueStatus =
  | 'In Moderation'
  | 'Reported'
  | 'Viewed'
  | 'Completed'
  | 'Archived'
  | 'Deleted';

export type TabvarCragCatalogItem = {
  id: number;
  name: string;
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  statsActiveIssueCount?: number | null;
  statsIssueFlagged?: number | null;
  statsPublicIssueCount?: number | null;
  createdAt?: string | null;
  attachments?: TabvarCatalogAttachment[];
};

export type TabvarSectorCatalogItem = {
  id: number;
  cragId: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  sortOrder?: number | null;
  createdAt?: string | null;
  attachments?: TabvarCatalogAttachment[];
};

export type TabvarRouteCatalogItem = {
  id: number;
  cragId: number;
  sectorId: number;
  name: string;
  altNames?: string | null;
  gradeYds?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  sortOrder?: number | null;
  boltCount?: number | null;
  pitchCount?: number | null;
  routeLength?: number | null;
  climbStyle?: string | null;
  year?: number | null;
  routeBuiltDate?: string | null;
  firstAscentBy?: string | null;
  firstAscentDate?: string | null;
  cragName?: string | null;
  sectorName?: string | null;
  createdAt?: string | null;
  attachments?: TabvarCatalogAttachment[];
};

export type TabvarIssue = {
  id: number;
  routeId: number;
  cragId?: number | null;
  issueType: string;
  subIssueType?: string | null;
  status: TabvarIssueStatus;
  lastStatus?: TabvarIssueStatus | null;
  description?: string | null;
  boltsAffected?: string | null;
  isFlagged?: boolean | null;
  flaggedMessage?: string | null;
  reportedBy?: string | null;
  reportedByUid?: string | null;
  createdAt?: string | null;
  updatedAt: string;
  lastModified?: string | null;
  approvedAt?: string | null;
  archivedAt?: string | null;
  attachments?: TabvarIssueAttachment[];
};

export type TabvarCragsResponse = {
  crags: TabvarCragCatalogItem[];
  serverTime: string;
};

export type TabvarSectorsResponse = {
  sectors: TabvarSectorCatalogItem[];
  serverTime: string;
};

export type TabvarRoutesResponse = {
  routes: TabvarRouteCatalogItem[];
  serverTime: string;
};

export type TabvarIssuesResponse = {
  issues: TabvarIssue[];
  serverTime: string;
};

export type TabvarIssueSyncOp = 'create' | 'update' | 'status';

export type TabvarIssueSyncFields = {
  routeId?: number;
  issueType?: string;
  subIssueType?: string | null;
  description?: string | null;
  boltsAffected?: string | null;
  status?: string;
  lastStatus?: string | null;
  isFlagged?: boolean;
  flaggedMessage?: string | null;
};

export type TabvarIssueSyncRequest = {
  op: TabvarIssueSyncOp;
  externalId?: string;
  issueId?: number;
  baseUpdatedAt?: string;
  fields?: TabvarIssueSyncFields;
};

export type TabvarIssueSyncResponse = {
  status: 'applied' | 'conflict';
  serverId: number;
  issue: TabvarIssue | null;
};
