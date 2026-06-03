import { type Href, router, usePathname } from 'expo-router';
import { useCallback } from 'react';

import { getParentHref } from '@/navigation/parentRoute';

export function navigateToParentFromPathname(pathname: string) {
  const parent = getParentHref(pathname);
  if (parent) {
    router.replace(parent as Href);
  }
}

export function useNavigateToParent() {
  const pathname = usePathname();

  return useCallback(() => {
    navigateToParentFromPathname(pathname);
  }, [pathname]);
}
