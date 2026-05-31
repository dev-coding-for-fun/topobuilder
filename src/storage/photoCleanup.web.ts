/**
 * Web photo storage uses inlined data URIs (see `assetStorage.web.ts`), so
 * there is no separate filesystem subtree to sweep. Dropping the rows is
 * sufficient. This keeps the migration runner happy without touching OPFS.
 */
export async function clearPhotosDirectory(): Promise<void> {
  return;
}
