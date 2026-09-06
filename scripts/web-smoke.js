const { spawn, spawnSync } = require('node:child_process');
const { firefox } = require('@playwright/test');

const port = Number(process.env.WEB_SMOKE_PORT ?? 8093);
const baseURL = `http://127.0.0.1:${port}`;
let server;

function run(command) {
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} failed with ${result.status ?? result.signal ?? 'unknown status'}`);
  }
}

async function waitForServer(timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}`);
}

async function main() {
  run('npx expo export --platform web');

  server = spawn(process.execPath, ['scripts/serve-web.js', 'dist', String(port)], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  await waitForServer();

  const browser = await firefox.launch({
    headless: true,
  });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.getByTestId('crags:screen').waitFor({ state: 'visible', timeout: 15_000 });
  await waitForCragsDataReady(page);
  pageErrors.length = 0;

  const testIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((element) =>
      element.getAttribute('data-testid'),
    ),
  );
  for (const expected of ['crags:screen', 'crags:search-input', 'crags:new-crag-fab']) {
    if (!testIds.includes(expected)) {
      throw new Error(`Missing data-testid: ${expected}`);
    }
  }

  const cragName = `Web smoke ${Date.now()}`;
  await page.getByTestId('crags:new-crag-fab').click();
  await page.getByTestId('crags:new-crag-sheet:input').fill(cragName);
  await page.getByTestId('crags:new-crag-sheet:confirm').click();
  await page.getByTestId('crag-detail:screen').waitFor({ state: 'visible', timeout: 15_000 });
  await expectText(page, 'crag-detail:summary', '1 sector · 0 topos');

  const cragUrl = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('crag-detail:screen').waitFor({ state: 'visible', timeout: 15_000 });
  await expectText(page, 'crag-detail:summary', '1 sector · 0 topos');

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.getByText(cragName).waitFor({ state: 'visible', timeout: 15_000 });
  await page.goto(cragUrl, { waitUntil: 'domcontentloaded' });

  await page.getByText('+ Add topo').first().click();
  await page.getByTestId('editor:no-photo').waitFor({ state: 'visible', timeout: 15_000 });
  await page.goBack();
  await page.getByTestId('crag-detail:screen').waitFor({ state: 'visible', timeout: 15_000 });
  await expectText(page, 'crag-detail:summary', '1 sector · 1 topo');

  const topoMenuId = await firstDynamicTestId(page, 'crag-detail:topo:', ':menu');
  await page.getByTestId(topoMenuId).click();
  await page.getByTestId('crag-detail:topo-menu:edit-info').click();
  await page.getByTestId('topo-info:sheet').waitFor({ state: 'visible', timeout: 15_000 });
  await replaceTextInputValue(page.getByTestId('topo-info:name'), 'South Face');
  await page.getByTestId('topo-info:name').blur();
  await page.getByRole('button', { name: 'Close' }).last().click();

  const createRouteId = await firstDynamicTestId(page, 'crag-detail:topo:', ':create-route');
  await page.getByTestId(createRouteId).click();
  await page.getByTestId('route-edit:sheet').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByLabel('Route name').waitFor({ state: 'visible', timeout: 15_000 });
  await replaceTextInputValue(page.getByTestId('route-edit:name'), 'Warmup Arete');
  await page.getByTestId('route-edit:name').blur();
  await replaceTextInputValue(page.getByTestId('route-edit:grade'), '5.8');
  await page.getByTestId('route-edit:grade').blur();
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.getByText('5.8 · Warmup Arete').waitFor({ state: 'visible', timeout: 15_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('South Face').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByText('5.8 · Warmup Arete').waitFor({ state: 'visible', timeout: 15_000 });

  // Create a second route to test route reordering by dragging
  await page.getByTestId(createRouteId).click();
  await page.getByTestId('route-edit:sheet').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByLabel('Route name').waitFor({ state: 'visible', timeout: 15_000 });
  await replaceTextInputValue(page.getByTestId('route-edit:name'), 'Crux Pitch');
  await page.getByTestId('route-edit:name').blur();
  await replaceTextInputValue(page.getByTestId('route-edit:grade'), '5.11a');
  await page.getByTestId('route-edit:grade').blur();
  await page.getByTestId('route-edit:sheet').getByRole('button', { name: 'Close' }).click();
  await page.getByText('Crux Pitch').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByText('5.11a').waitFor({ state: 'visible', timeout: 15_000 });

  // Locate the drag handles for both routes
  const dragHandles = page.locator('[data-testid$=":drag-handle"]');
  await dragHandles.nth(1).waitFor({ state: 'visible', timeout: 15_000 });

  const firstBox = await dragHandles.nth(0).boundingBox();
  const secondBox = await dragHandles.nth(1).boundingBox();
  if (!firstBox || !secondBox) {
    throw new Error('Could not find drag handles for reorder test');
  }

  // Drag the second route (Crux Pitch) upwards past the first route (Warmup Arete)
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y - 20, { steps: 10 });
  await new Promise((r) => setTimeout(r, 100));

  // Release mouse to drop at slot 0
  await page.mouse.up();

  // Wait for reordered list: Crux Pitch should now appear first, Warmup Arete second
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid*=":route-row:"]'));
    return (
      rows.length >= 2 &&
      rows[0]?.textContent?.includes('Crux Pitch') &&
      rows[1]?.textContent?.includes('Warmup Arete')
    );
  }, { timeout: 10_000 });

  // Reload page to confirm order persistence in SQLite
  await new Promise((r) => setTimeout(r, 600));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid*=":route-row:"]'));
    return (
      rows.length >= 2 &&
      rows[0]?.textContent?.includes('Crux Pitch') &&
      rows[1]?.textContent?.includes('Warmup Arete')
    );
  }, { timeout: 10_000 });

  // Create a third route to test dropping between 2 others
  await page.getByTestId(createRouteId).click();
  await page.getByTestId('route-edit:sheet').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByLabel('Route name').waitFor({ state: 'visible', timeout: 15_000 });
  await replaceTextInputValue(page.getByTestId('route-edit:name'), 'Directissima');
  await page.getByTestId('route-edit:name').blur();
  await replaceTextInputValue(page.getByTestId('route-edit:grade'), '5.12a');
  await page.getByTestId('route-edit:grade').blur();
  await page.getByTestId('route-edit:sheet').getByRole('button', { name: 'Close' }).click();
  await page.getByText('Directissima').waitFor({ state: 'visible', timeout: 15_000 });

  // There are now 3 routes:
  // 0: Crux Pitch
  // 1: Warmup Arete
  // 2: Directissima
  // Drag Directissima (row 2) UP to drop it BETWEEN Crux Pitch (row 0) and Warmup Arete (row 1)
  const threeDragHandles = page.locator('[data-testid$=":drag-handle"]');
  await threeDragHandles.nth(2).waitFor({ state: 'visible', timeout: 15_000 });

  const box0 = await threeDragHandles.nth(0).boundingBox();
  const box1 = await threeDragHandles.nth(1).boundingBox();
  const box2 = await threeDragHandles.nth(2).boundingBox();
  if (!box0 || !box1 || !box2) {
    throw new Error('Could not find all 3 drag handles for drop-between test');
  }

  // Target the slot between box0 (Crux Pitch) and box1 (Warmup Arete)
  const targetBetweenY = (box0.y + box0.height + box1.y) / 2;
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box0.x + box0.width / 2, targetBetweenY, { steps: 10 });
  await new Promise((r) => setTimeout(r, 100));

  // Release mouse to drop at slot 1 (between Crux Pitch and Warmup Arete)
  await page.mouse.up();

  // Wait for new reordered list:
  // 0: Crux Pitch
  // 1: Directissima
  // 2: Warmup Arete
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid*=":route-row:"]'));
    return (
      rows.length >= 3 &&
      rows[0]?.textContent?.includes('Crux Pitch') &&
      rows[1]?.textContent?.includes('Directissima') &&
      rows[2]?.textContent?.includes('Warmup Arete')
    );
  }, { timeout: 10_000 });

  // Reload page to confirm drop-between order persistence in SQLite
  await new Promise((r) => setTimeout(r, 600));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid*=":route-row:"]'));
    return (
      rows.length >= 3 &&
      rows[0]?.textContent?.includes('Crux Pitch') &&
      rows[1]?.textContent?.includes('Directissima') &&
      rows[2]?.textContent?.includes('Warmup Arete')
    );
  }, { timeout: 10_000 });

  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors: ${pageErrors.join('\n')}`);
  }

  console.log('Web smoke test passed');
  await browser.close();
}

main()
  .then(() => {
    server?.kill();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    server?.kill();
    process.exit(1);
  });

async function expectText(page, testId, expected) {
  const actual = await page.getByTestId(testId).innerText();
  if (actual !== expected) {
    throw new Error(`Expected ${testId} to be "${expected}", got "${actual}"`);
  }
}

async function waitForCragsDataReady(page) {
  await page.waitForFunction(() => {
    const bodyText = document.body.innerText;
    return (
      bodyText.includes('No crags yet') ||
      Boolean(document.querySelector('[data-testid^="crags:card:"]'))
    );
  });
}

async function firstDynamicTestId(page, prefix, suffix) {
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
        .find(
          (testId) =>
            typeof testId === 'string' &&
            testId.startsWith(testIdPrefix) &&
            testId.endsWith(testIdSuffix),
        ),
    [prefix, suffix],
  );

  if (!id) {
    throw new Error(`Could not find testID matching ${prefix}*${suffix}`);
  }

  return id;
}

async function replaceTextInputValue(locator, value) {
  await locator.click();
  await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await locator.press('Backspace');
  await locator.pressSequentially(value);
}
