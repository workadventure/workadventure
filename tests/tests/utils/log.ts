import { expect, Page } from '@playwright/test';

let logs = [];

/**
 * Tries to find a given log message in the logs (for 10 seconds)
 *
 * @deprecated Avoid using this function. Rely on expect instead.
 */
export async function assertLogMessage(
    page: Page,
    substring: string,
    timeout = 10000
): Promise<void> {
  await expect.poll(() => logs, {
    timeout
  }).toContain(substring);
}

/**
 * @deprecated Avoid using this function. Rely on expect instead.
 */
export function startRecordLogs(page: Page) {
  page.on('console', async (msg) => {
    logs.push(msg.text());
  });
}

/**
 * @deprecated Avoid using this function. Rely on expect instead.
 */
export function abortRecordLogs(page: Page){
  logs = [];
  page.on('console', async () => null);
}
