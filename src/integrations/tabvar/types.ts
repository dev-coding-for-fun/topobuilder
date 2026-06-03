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
  tabvarUserId?: string;
  userId?: string;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  displayName?: string;
  email?: string;
};
