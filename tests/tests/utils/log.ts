import { expect } from '@playwright/test';

/**
 * Tries to find a given log message in the logs (for 10 seconds)
 */
export async function assertLogMessage(page, substring): Promise<void> {
  let logs = [];
  await page.on('console', async (msg) => {
    logs.push(await msg.text());
  });

  // wait for log to appear
  for (let i = 0; i < 10; i++) {
    if (logs.includes(substring)) {
      break;
    }
    await page.waitForTimeout(50);
  }

  expect(logs).toContain(substring);
}
