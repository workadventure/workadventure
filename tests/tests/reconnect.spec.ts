import { expect, test } from '@playwright/test';
import { findContainer, startContainer, stopContainer } from './utils/containers';
import { login } from './utils/roles';

test.setTimeout(60000);
test.describe('Connection', () => {
  test('can succeed even if WorkAdventure starts while pusher is down', async ({ page }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json'
    );

    // Let's stop the pusher
    const container = await findContainer('pusher');
    await stopContainer(container);

    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json'
    );
    await expect(page.locator('.error-div')).toContainText('Unable to connect to WorkAdventure');

    await startContainer(container);

    await page.waitForResponse(response => response.status() === 200, { timeout: 60000 }),
    await login(page);
  });
});
