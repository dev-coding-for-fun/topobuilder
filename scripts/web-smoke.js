const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('@playwright/test');

const port = 8091;
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

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.getByTestId('project-list:screen').waitFor({ state: 'visible', timeout: 15_000 });

  const testIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((element) =>
      element.getAttribute('data-testid'),
    ),
  );
  for (const expected of [
    'project-list:screen',
    'project-list:eyebrow',
    'project-list:create-card',
    'project-list:name-input',
    'project-list:create-button',
  ]) {
    if (!testIds.includes(expected)) {
      throw new Error(`Missing data-testid: ${expected}`);
    }
  }

  const eyebrow = await page.getByTestId('project-list:eyebrow').innerText();
  if (eyebrow !== 'OFFLINE TOPO BUILDER') {
    throw new Error(`Unexpected eyebrow text: ${eyebrow}`);
  }
  if (pageErrors.length > 0) {
    throw new Error(`Browser page errors: ${pageErrors.join('\n')}`);
  }

  console.log('Web smoke test passed');
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
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
