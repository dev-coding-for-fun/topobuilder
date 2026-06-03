import * as Linking from 'expo-linking';

import { getTabvarConnectUrl } from './config';

const CALLBACK_PATH = 'tabvar-connect';

export function createTabvarConnectState() {
  const randomPart = Math.random().toString(36).slice(2);
  const timePart = Date.now().toString(36);
  return `${timePart}.${randomPart}`;
}

export function buildTabvarCallbackUrl(state: string) {
  return Linking.createURL(CALLBACK_PATH, {
    queryParams: { state },
  });
}

export function buildTabvarConnectUrl(state: string) {
  const url = new URL(getTabvarConnectUrl());
  url.searchParams.set('return_to', buildTabvarCallbackUrl(state));
  return url.toString();
}
