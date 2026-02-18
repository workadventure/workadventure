import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function getWebRtcConnectionsCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        console.log("Current webRTC connections count:", window.e2eHooks.getWebRtcConnectionsCount());
        return window.e2eHooks.getWebRtcConnectionsCount();
    });
}

export function expectWebRtcConnectionsCountToBe(
    page: Page,
    expectedCount: number,
    timeout: number = 10000,
): Promise<void> {
    return expect
        .poll(
            async () => {
                return getWebRtcConnectionsCount(page);
            },
            {
                timeout: timeout,
            },
        )
        .toBe(expectedCount);
}

export function getLivekitConnectionsCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        return window.e2eHooks.getLivekitConnectionsCount();
    });
}

export function expectLivekitConnectionsCountToBe(
    page: Page,
    expectedCount: number,
    timeout: number = 10000,
): Promise<void> {
    return expect
        .poll(
            async () => {
                return getLivekitConnectionsCount(page);
            },
            {
                timeout: timeout,
            },
        )
        .toBe(expectedCount);
}

export function getLivekitRoomsCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        return window.e2eHooks.getLivekitRoomsCount();
    });
}

export function expectLivekitRoomsCountToBe(page: Page, expectedCount: number, timeout: number = 10000): Promise<void> {
    return expect
        .poll(
            async () => {
                return getLivekitRoomsCount(page);
            },
            {
                timeout: timeout,
            },
        )
        .toBe(expectedCount);
}

/**
 * Waits for WebRTC connection count to drop to 0, confirming disconnection occurred.
 * Polls the connection count until it reaches 0 or times out.
 * @param timeout - Maximum time to wait for disconnection (default: 10s)
 * @returns true if disconnection was observed, rejects if timeout
 */
export async function waitForWebRtcDisconnection(page: Page, timeout = 10_000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const count = await getWebRtcConnectionsCount(page);
        if (count === 0) {
            return true;
        }
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
        });
    }
    throw new Error(`WebRTC disconnection not observed within ${timeout}ms`);
}

/**
 * Triggers a WebRTC failure and verifies the full disconnect/reconnect cycle.
 * @param page - The page to trigger the failure on
 * @param disconnectionTimeout - Time to wait for disconnection (default: 10s)
 * @param reconnectionTimeout - Time to wait for reconnection (default: 60s)
 * @returns Object with disconnectionObserved flag and the trigger result
 */
export async function triggerWebRtcRetryAndVerifyReconnection(
    page: Page,
    disconnectionTimeout = 10_000,
    reconnectionTimeout = 60_000,
): Promise<{
    disconnectionObserved: boolean;
    result: { spaceName: string; userId: string; triggered: boolean } | null;
}> {
    // Trigger the failure
    const result = await triggerWebRtcRetry(page);

    if (!result || !result.triggered) {
        return { disconnectionObserved: false, result };
    }

    // Wait for disconnection (count drops to 0)
    const disconnectionObserved = await waitForWebRtcDisconnection(page, disconnectionTimeout);

    // Wait for reconnection (count goes back to expected value)
    await expectWebRtcConnectionsCountToBe(page, 1, reconnectionTimeout);

    return { disconnectionObserved, result };
}

/**
 * [E2E TEST] Forces a WebRTC peer failure to test the retry mechanism.
 * @returns Information about the triggered failure, or null if no peers found
 */
export function triggerWebRtcRetry(
    page: Page,
): Promise<{ spaceName: string; userId: string; triggered: boolean } | null> {
    return page.evaluate(() => window.e2eHooks.testWebRtcRetry());
}

/**
 * [E2E TEST] Forces a LiveKit WebSocket close to test the reconnection mechanism.
 * @returns Information about the triggered close, or null if no LiveKit connection found
 */
export function triggerLivekitRetry(page: Page): Promise<{ spaceName: string; closed: boolean } | null> {
    return page.evaluate(() => window.e2eHooks.testLivekitRetry());
}

/**
 * Waits for LiveKit connection count to drop below the initial count, confirming disconnection occurred.
 * Polls the connection count until it drops or times out.
 * @param initialCount - The initial connection count before triggering failure
 * @param timeout - Maximum time to wait for disconnection (default: 10s)
 * @returns true if disconnection was observed, rejects if timeout
 */
export async function waitForLivekitDisconnection(
    page: Page,
    initialCount: number,
    timeout = 10_000,
): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const count = await getLivekitConnectionsCount(page);
        if (count < initialCount) {
            return true;
        }
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
        });
    }
    throw new Error(`LiveKit disconnection not observed within ${timeout}ms (initial: ${initialCount})`);
}

/**
 * Triggers a LiveKit failure and verifies the full disconnect/reconnect cycle.
 * @param page - The page to trigger the failure on
 * @param expectedCount - The expected connection count after reconnection
 * @param disconnectionTimeout - Time to wait for disconnection (default: 10s)
 * @param reconnectionTimeout - Time to wait for reconnection (default: 60s)
 * @returns Object with disconnectionObserved flag and the trigger result
 */
export async function triggerLivekitRetryAndVerifyReconnection(
    page: Page,
    expectedCount: number,
    disconnectionTimeout = 10_000,
    reconnectionTimeout = 60_000,
): Promise<{ disconnectionObserved: boolean; result: { spaceName: string; closed: boolean } | null }> {
    // Get initial count before triggering failure
    const initialCount = await getLivekitConnectionsCount(page);

    // Trigger the failure
    const result = await triggerLivekitRetry(page);

    if (!result || !result.closed) {
        return { disconnectionObserved: false, result };
    }

    // Wait for disconnection (count drops below initial)
    const disconnectionObserved = await waitForLivekitDisconnection(page, initialCount, disconnectionTimeout);

    // Wait for reconnection (count goes back to expected value)
    await expectLivekitConnectionsCountToBe(page, expectedCount, reconnectionTimeout);

    return { disconnectionObserved, result };
}
