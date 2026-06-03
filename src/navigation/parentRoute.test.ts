import { getParentHref, getParentHrefFromSegments } from '@/navigation/parentRoute';

describe('getParentHrefFromSegments', () => {
  it('returns null for the crags list root', () => {
    expect(getParentHrefFromSegments([])).toBeNull();
  });

  it('returns the crags list for settings', () => {
    expect(getParentHrefFromSegments(['settings'])).toBe('/');
  });

  it('returns settings for nested settings screens', () => {
    expect(getParentHrefFromSegments(['settings', 'cloudflare-r2'])).toBe('/settings');
  });

  it('returns settings for the tabvar connect callback', () => {
    expect(getParentHrefFromSegments(['tabvar-connect'])).toBe('/settings');
  });

  it('returns the crags list for a crag detail screen', () => {
    expect(getParentHrefFromSegments(['crags', 'abc'])).toBe('/');
  });

  it('returns the crag for the editor', () => {
    expect(getParentHrefFromSegments(['crags', 'abc', 'topos', 'xyz', 'editor'])).toBe('/crags/abc');
  });

  it('returns the editor for the camera screen', () => {
    expect(getParentHrefFromSegments(['crags', 'abc', 'topos', 'xyz', 'camera'])).toBe(
      '/crags/abc/topos/xyz/editor',
    );
  });

  it('returns null for unknown routes', () => {
    expect(getParentHrefFromSegments(['unknown'])).toBeNull();
  });
});

describe('getParentHref', () => {
  it('treats /index as the crags list root', () => {
    expect(getParentHref('/index')).toBeNull();
  });

  it('returns the concrete crag route for a concrete editor pathname', () => {
    expect(getParentHref('/crags/crag_mpu8tt1l_l43lucz1/topos/topo_123/editor')).toBe(
      '/crags/crag_mpu8tt1l_l43lucz1',
    );
  });

  it('does not navigate to unresolved dynamic route patterns', () => {
    expect(getParentHref('/crags/[cragId]/topos/[topoId]/editor')).toBeNull();
  });
});
