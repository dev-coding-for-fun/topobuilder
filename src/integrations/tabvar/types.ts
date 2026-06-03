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
