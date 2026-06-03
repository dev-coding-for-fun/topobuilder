import { type Href, router, useSegments } from 'expo-router';
import { useCallback } from 'react';

import { getParentHrefFromSegments } from '@/navigation/parentRoute';

export function navigateToParentFromSegments(segments: readonly string[]) {
  const parent = getParentHrefFromSegments(segments);
  if (parent) {
    router.replace(parent as Href);
  }
}

export function useNavigateToParent() {
  const segments = useSegments();

  return useCallback(() => {
    navigateToParentFromSegments(segments);
  }, [segments]);
}
