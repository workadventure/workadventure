import { expect, Page } from '@playwright/test';

const POLLING_INTERVAL = 50;

/**
 * Tries to find a given log message in the logs (for 10 seconds)
 */
export async function assertLogMessage(
  page: Page,
  substring: string,
  timeout: number = 10000
): Promise<void> {
  let logs = [];
  await page.on('console', async (msg) => {
    logs.push(await msg.text());
  });

  // wait for log to appear
  for (let i = 0; i < timeout / POLLING_INTERVAL; i++) {
    if (logs.includes(substring)) {
      break;
    }
    await page.waitForTimeout(POLLING_INTERVAL);
  }

  expect(logs).toContain(substring);
}
