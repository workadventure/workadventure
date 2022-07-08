import { expect, Page } from '@playwright/test';

const POLLING_INTERVAL = 50;

/**
 * Tries to find a given log message in the logs (for 10 seconds)
 */
let logs = [];
export async function assertLogMessage(
  page: Page,
  substring: string,
  timeout: number = 10000
): Promise<void> {
  // wait for log to appear
  for (let i = 0; i < timeout / POLLING_INTERVAL; i++) {
    if (logs.includes(substring)) {
      break;
    }
    await page.waitForTimeout(POLLING_INTERVAL);
  }

  expect(logs).toContain(substring);
}
export function startRecordLogs(page: Page) {
  page.on('console', (msg) => {
    logs.push(msg.text());
  });
}
export function abortRecordLogs(page: Page){
  logs = [];
  page.on('console', async () => null);
}
