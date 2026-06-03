import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { NavBackButton } from '@/navigation/NavBackButton';
import { getParentHrefFromSegments } from '@/navigation/parentRoute';

export const stackScreenOptions: NativeStackNavigationOptions = {
  contentStyle: { backgroundColor: '#F8FAFC' },
  headerBackVisible: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#F8FAFC' },
  headerTintColor: '#111827',
};

/** Crags list — never show a stack/history back control. */
export const rootHeaderOptions: NativeStackNavigationOptions = {
  headerBackVisible: false,
  headerLeft: () => null,
  gestureEnabled: false,
};

export function parentBackHeaderOptions(parentHref: string): NativeStackNavigationOptions {
  return {
    headerBackVisible: false,
    headerLeft: () => <NavBackButton href={parentHref} />,
  };
}

export function stackScreenOptionsForSegments(
  segments: readonly string[],
): NativeStackNavigationOptions {
  const parentHref = getParentHrefFromSegments(segments);

  return {
    ...stackScreenOptions,
    ...(parentHref ? parentBackHeaderOptions(parentHref) : rootHeaderOptions),
  };
}
