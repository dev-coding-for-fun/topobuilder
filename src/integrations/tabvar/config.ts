const DEV_CONNECT_URL = 'http://localhost:5173/connect/topobuilder';
const PROD_CONNECT_URL = 'https://app.tabvar.org/connect/topobuilder';

declare const __DEV__: boolean;

function configuredConnectUrl() {
  return process.env.EXPO_PUBLIC_TABVAR_CONNECT_URL?.trim();
}

export function getTabvarConnectUrl() {
  return configuredConnectUrl() || (__DEV__ ? DEV_CONNECT_URL : PROD_CONNECT_URL);
}

export function getTabvarApiBaseUrl() {
  const connectUrl = new URL(getTabvarConnectUrl());
  return connectUrl.origin;
}
