import { expect, test } from '@playwright/test';

test('loads the project list', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByTestId('project-list:screen')).toBeVisible();
  await expect(page.getByTestId('project-list:eyebrow')).toHaveText('Offline topo builder');
  await expect(page.getByTestId('project-list:create-card')).toBeVisible();
  await expect(page.getByTestId('project-list:create-button')).toBeVisible();

  expect(pageErrors).toEqual([]);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('beforeunload'));
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  });
});
