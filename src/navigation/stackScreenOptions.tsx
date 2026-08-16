import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';

import { NavBackButton } from '@/navigation/NavBackButton';
import { getParentHref } from '@/navigation/parentRoute';

type StackScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack>['screenOptions']>,
  Function
>;

export const stackScreenOptions: StackScreenOptions = {
  contentStyle: { backgroundColor: '#F8FAFC' },
  headerBackVisible: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#F8FAFC' },
  headerTintColor: '#111827',
};

/** Crags list — never show a stack/history back control. */
export const rootHeaderOptions: StackScreenOptions = {
  headerBackVisible: false,
  headerLeft: () => null,
  gestureEnabled: false,
};

export function parentBackHeaderOptions(parentHref: string): StackScreenOptions {
  return {
    headerBackVisible: false,
    headerLeft: () => <NavBackButton href={parentHref} />,
  };
}

export function stackScreenOptionsForPathname(pathname: string): StackScreenOptions {
  const parentHref = getParentHref(pathname);

  return {
    ...stackScreenOptions,
    ...(parentHref ? parentBackHeaderOptions(parentHref) : rootHeaderOptions),
  };
}
