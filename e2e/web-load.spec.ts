import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('mobile web shell', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('creates a crag, shows the default sector, adds a topo, and opens the editor', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const cragName = `E2E Happy ${Date.now()}`;

    await page.goto('/');
    await expect(page.getByTestId('crags:screen')).toBeVisible();

    await createCrag(page, cragName);

    await expect(page.getByTestId('crag-detail:screen')).toBeVisible();
    await expect(page.getByTestId('crag-detail:summary')).toContainText('1 sector · 0 topos');
    await expect(page.getByRole('heading', { name: cragName })).toBeVisible();

    await page.getByText('+ Add topo').first().click();
    await expect(page.getByTestId('editor:no-photo')).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('crag-detail:summary')).toContainText('1 sector · 1 topo');

    const topoOpenId = await firstDynamicTestId(page, 'crag-detail:topo:', ':open');
    await page.getByTestId(topoOpenId).click();
    await expect(page.getByTestId('editor:no-photo')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('edits topo info and persists an inline route after reload', async ({ page }) => {
    const cragName = `E2E Info ${Date.now()}`;

    await page.goto('/');
    await createCrag(page, cragName);
    await page.getByText('+ Add topo').first().click();
    await expect(page.getByTestId('editor:no-photo')).toBeVisible();
    await page.goBack();

    await openTopoInfoSheet(page);

    await replaceTextInputValue(page.getByTestId('topo-info:name'), 'South Face');
    await page.getByTestId('topo-info:name').blur();
    await page.getByTestId('topo-info:description').fill('Morning shade.');
    await page.getByRole('button', { name: '+ Add route' }).click();
    await expect(page.getByLabel('Route name')).toBeVisible();

    const routeNameId = await firstDynamicTestId(page, 'topo-info:route:', ':name');
    const routeGradeId = await firstDynamicTestId(page, 'topo-info:route:', ':grade');
    await page.getByTestId(routeNameId).fill('Warmup Arete');
    await page.getByTestId(routeNameId).blur();
    await page.getByTestId(routeGradeId).fill('5.8');
    await page.getByTestId(routeGradeId).blur();

    await page.getByRole('button', { name: 'Close' }).last().click();

    await expect(page.getByText('South Face').first()).toBeVisible();
    await expect(page.getByText('5.8 · Warmup Arete').first()).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('crag-detail:screen')).toBeVisible();
    await expect(page.getByText('South Face').first()).toBeVisible();
    await expect(page.getByText('5.8 · Warmup Arete').first()).toBeVisible();
  });

  test('opens share placeholders for crag, sector, and topo scopes', async ({ page }) => {
    const cragName = `E2E Share ${Date.now()}`;

    await page.goto('/');
    await createCrag(page, cragName);
    await page.getByText('+ Add topo').first().click();
    await expect(page.getByTestId('editor:no-photo')).toBeVisible();
    await page.goBack();

    await page.getByTestId('crag-detail:header:share').click();
    await expect(page.getByTestId('share-placeholder:scope')).toContainText(`crag “${cragName}”`);
    await page.getByTestId('share-placeholder:close').click();

    const sectorShareId = await firstDynamicTestId(page, 'crag-detail:sector:', ':share');
    await page.getByTestId(sectorShareId).click();
    await expect(page.getByTestId('share-placeholder:scope')).toContainText(
      `sector “${cragName}”`,
    );
    await page.getByTestId('share-placeholder:close').click();

    const topoShareId = await firstDynamicTestId(page, 'crag-detail:topo:', ':share');
    await page.getByTestId(topoShareId).click();
    await expect(page.getByTestId('share-placeholder:scope')).toContainText('topo “Topo 1”');
    await page.getByTestId('share-placeholder:close').click();

    await expect(page.getByTestId('share-placeholder:sheet')).not.toBeVisible();
  });

  test('navigates from settings to the Cloudflare R2 placeholder screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('crags:screen')).toBeVisible();

    await page.getByTestId('crags:settings-button').click();
    await expect(page.getByTestId('settings:screen')).toBeVisible();
    await expect(page.getByTestId('settings:tabvar')).toContainText('Not connected');
    await expect(page.getByTestId('settings:r2')).toContainText('Cloudflare R2');

    await page.getByTestId('settings:r2').click();
    await expect(page.getByTestId('settings:r2-screen')).toBeVisible();
    await expect(page.getByTestId('settings:r2:account-id')).toBeVisible();
    await expect(page.getByTestId('settings:r2:access-key-id')).toBeVisible();
    await expect(page.getByTestId('settings:r2:secret')).toBeVisible();
    await expect(page.getByTestId('settings:r2:bucket')).toBeVisible();
    await expect(page.getByTestId('settings:r2:endpoint')).toBeVisible();
    await expect(page.getByTestId('settings:r2:test')).toBeDisabled();
    await expect(page.getByTestId('settings:r2:save')).toBeDisabled();
  });
});

async function createCrag(page: import('@playwright/test').Page, name: string) {
  await page.getByTestId('crags:new-crag-fab').click();
  await page.getByTestId('crags:new-crag-sheet:input').fill(name);
  await page.getByTestId('crags:new-crag-sheet:confirm').click();
  await expect(page.getByTestId('crag-detail:screen')).toBeVisible();
}

async function openTopoInfoSheet(page: import('@playwright/test').Page) {
  const topoMenuId = await firstDynamicTestId(page, 'crag-detail:topo:', ':menu');
  await page.getByTestId(topoMenuId).click();
  await page.getByTestId('crag-detail:topo-menu:edit-info').click();
  await expect(page.getByTestId('topo-info:sheet')).toBeVisible();
}

async function firstDynamicTestId(
  page: import('@playwright/test').Page,
  prefix: string,
  suffix: string,
) {
  const id = await page.evaluate(
    ([testIdPrefix, testIdSuffix]) =>
      Array.from(document.querySelectorAll('[data-testid]'))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
          );
        })
        .map((element) => element.getAttribute('data-testid'))
        .find((testId): testId is string => {
          return (
            typeof testId === 'string' &&
            testId.startsWith(testIdPrefix) &&
            testId.endsWith(testIdSuffix)
          );
        }),
    [prefix, suffix],
  );

  if (!id) {
    throw new Error(`Could not find testID matching ${prefix}*${suffix}`);
  }

  return id;
}

async function replaceTextInputValue(
  locator: ReturnType<import('@playwright/test').Page['getByTestId']>,
  value: string,
) {
  await locator.click();
  await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await locator.press('Backspace');
  await locator.pressSequentially(value);
}
