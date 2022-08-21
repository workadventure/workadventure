import { expect, Page } from '@playwright/test';

/**
 * Tries to find a given log message in the logs (for 10 seconds)
 */
let logs = [];
export async function assertLogMessage(
    page: Page,
    substring: string,
    timeout = 10000
): Promise<void> {
  await page.on('console', async (msg) => {
    logs.push(await msg.text());
  });

  await expect.poll(() => logs, {
    timeout
  }).toContain(substring);
}

/*export async function assertLogMessage(
  page: Page,
  substring: string,
  timeout: number = 20_000
): Promise<void> {
  // wait for log to appear
  for (let i = 0; i < timeout / POLLING_INTERVAL; i++) {
    if (logs.includes(substring)) {
      break;
    }
    await page.waitForTimeout(POLLING_INTERVAL);
  }

  expect(logs).toContain(substring);
}*/
export function startRecordLogs(page: Page) {
  page.on('console', async (msg) => {
    logs.push(msg.text());
  });
}
export function abortRecordLogs(page: Page){
  logs = [];
  page.on('console', async () => null);
}
