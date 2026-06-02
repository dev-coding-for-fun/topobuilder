import { join } from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Regression capture for the "spacebar blows up the editor" bug (web).
 *
 * Root cause: the in-canvas label `TextInput` is rendered *inside* the
 * `GestureDetector` in `TopoCanvas`. react-native-gesture-handler's web build
 * installs a `KeyboardEventManager` whose activation keys are `['Enter', ' ']`
 * and which listens for `keydown` on the gesture view. The focused label
 * textarea is a DOM descendant of that view, so pressing the spacebar while
 * typing bubbles up and fires a *phantom canvas tap*. In `select` mode that tap
 * runs hit-testing/selection, deselects the label, commits the (now empty)
 * annotation, and tears the edit session down — the typed text vanishes, the
 * tool snaps back to Select, and the canvas is left blank.
 *
 * Fix: on web, Enter/Space key events originating from the label text field are
 * stopped in the capture phase before they reach gesture-handler's listener, so
 * no phantom tap is fired. The space is typed into the label as expected.
 *
 * The test also asserts the editor canvas actually renders (non-zero size) so a
 * regression that blanks the editor is caught here too.
 */

const PHOTO_FIXTURE = join(__dirname, '..', 'assets', 'icon.png');

test.describe.configure({ mode: 'serial' });

test.describe('editor text annotation keyboard input', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps the in-progress label alive when typing a space', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    // React surfaces render-time throws (e.g. Skia's "Not implemented on React
    // Native Web" from the system font fallback) via console.error rather than an
    // uncaught pageerror, so capture those too.
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    const cragName = `E2E Spacebar ${Date.now()}`;

    await page.goto('/');
    await expect(page.getByTestId('crags:screen')).toBeVisible();

    await page.getByTestId('crags:new-crag-fab').click();
    await page.getByTestId('crags:new-crag-sheet:input').fill(cragName);
    await page.getByTestId('crags:new-crag-sheet:confirm').click();
    await expect(page.getByTestId('crag-detail:screen')).toBeVisible();

    await page.getByText('+ Add topo').first().click();
    await expect(page.getByTestId('editor:no-photo')).toBeVisible();

    // Import a photo so the Skia canvas (and the label editor) renders.
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('editor:no-photo:import').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(PHOTO_FIXTURE);

    await expect(page.getByTestId('editor:screen')).toBeVisible();

    // The Skia canvas must render with a real size — guards against a layout
    // regression that leaves the editor blank.
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.width ?? 0).toBeGreaterThan(100);
    expect(canvasBox?.height ?? 0).toBeGreaterThan(100);

    // Choose the Text tool and tap the canvas to place a label.
    await page.getByTestId('editor:tool-label').click();
    await page.getByTestId('editor-canvas-region').click({ position: { x: 195, y: 360 } });

    // The label TextInput auto-focuses; it has pointerEvents="none" so we type
    // through the focused element rather than clicking it.
    const labelInput = page.locator('textarea');
    await expect(labelInput).toBeVisible();

    await page.keyboard.type('Pitch');
    await expect(labelInput).toHaveValue('Pitch');

    // Before the fix this fired a phantom canvas tap that destroyed the edit;
    // now the space simply lands in the label input.
    await page.keyboard.press('Space');

    await expect(page.getByTestId('editor:screen')).toBeVisible();
    await expect(labelInput).toHaveValue('Pitch ');

    // Commit the label (selecting a tool saves + deselects it) so it becomes a
    // *drawn* Skia text item rather than the live textarea. On web this is the
    // path that calls into the font system; a regression here (e.g. calling the
    // unimplemented FontMgr.System) throws synchronously and blanks the whole
    // canvas, so we assert the editor and canvas survive with no page errors.
    await page.getByTestId('editor:tool-select').click();
    await expect(labelInput).toBeHidden();

    await expect(page.getByTestId('editor:screen')).toBeVisible();
    const committedCanvasBox = await canvas.boundingBox();
    expect(committedCanvasBox?.width ?? 0).toBeGreaterThan(100);
    expect(committedCanvasBox?.height ?? 0).toBeGreaterThan(100);
    expect(pageErrors).toEqual([]);
    expect(
      consoleErrors.filter((message) => message.includes('Not implemented on React Native Web')),
    ).toEqual([]);
  });
});
