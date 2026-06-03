/**
 * Logical parent routes for stack screens. Back navigation uses these paths
 * instead of browser/history stack (`router.back()`).
 */
export function getParentHrefFromSegments(segments: readonly string[]): string | null {
  const path = segments.filter((segment) => !segment.startsWith('('));

  if (path.length === 0) {
    return null;
  }

  if (path[0] === 'settings') {
    return path.length === 1 ? '/' : '/settings';
  }

  if (path[0] === 'tabvar-connect') {
    return '/settings';
  }

  if (path[0] === 'crags' && path.length === 2) {
    return '/';
  }

  if (path[0] === 'crags' && path.length === 5 && path[2] === 'topos') {
    const cragId = path[1];
    const topoId = path[3];
    const screen = path[4];

    if (screen === 'editor') {
      return `/crags/${cragId}`;
    }

    if (screen === 'camera') {
      return `/crags/${cragId}/topos/${topoId}/editor`;
    }
  }

  return null;
}

/** @deprecated Prefer {@link getParentHrefFromSegments}; pathname alone is unreliable for the index route. */
export function getParentHref(pathname: string): string | null {
  const path = normalizePathname(pathname);

  if (isRootPath(path)) {
    return null;
  }

  return getParentHrefFromSegments(path.split('/').filter(Boolean));
}

function isRootPath(path: string) {
  return path === '/' || path === '/index';
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}
