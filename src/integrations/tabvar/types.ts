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
