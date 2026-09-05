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
  await page.getByRole('button', { name: '+ Add route' }).click();
  await page.getByLabel('Route name').waitFor({ state: 'visible', timeout: 15_000 });
  const routeNameId = await firstDynamicTestId(page, 'topo-info:route:', ':name');
  const routeGradeId = await firstDynamicTestId(page, 'topo-info:route:', ':grade');
  await replaceTextInputValue(page.getByTestId(routeNameId), 'Warmup Arete');
  await page.getByTestId(routeNameId).blur();
  await replaceTextInputValue(page.getByTestId(routeGradeId), '5.8');
  await page.getByTestId(routeGradeId).blur();
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.getByText('5.8 · Warmup Arete').waitFor({ state: 'visible', timeout: 15_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('South Face').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByText('5.8 · Warmup Arete').waitFor({ state: 'visible', timeout: 15_000 });

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
