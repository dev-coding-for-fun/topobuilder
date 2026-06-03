import * as Linking from 'expo-linking';

import { getTabvarConnectUrl } from './config';

const CALLBACK_PATH = 'tabvar-connect';

export function buildTabvarCallbackUrl() {
  return Linking.createURL(CALLBACK_PATH);
}

export function buildTabvarConnectUrl() {
  const url = new URL(getTabvarConnectUrl());
  url.searchParams.set('return_to', buildTabvarCallbackUrl());
  return url.toString();
}
