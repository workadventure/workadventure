import type { Page} from "@playwright/test";
import {expect} from "@playwright/test";

export function getWebRtcConnectionsCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        console.log("Current webRTC connections count:", window.e2eHooks.getWebRtcConnectionsCount());
        return window.e2eHooks.getWebRtcConnectionsCount();
    });
}

export function expectWebRtcConnectionsCountToBe(page: Page, expectedCount: number, timeout: number = 10000): Promise<void> {
    return expect.poll(async () => {
        return getWebRtcConnectionsCount(page);
    }, {
        timeout: timeout,
    }).toBe(expectedCount);
}

export function getLivekitConnectionsCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        return window.e2eHooks.getLivekitConnectionsCount();
    });
}

export function expectLivekitConnectionsCountToBe(page: Page, expectedCount: number, timeout: number = 10000): Promise<void> {
    return expect.poll(async () => {
        return getLivekitConnectionsCount(page);
    }, {
        timeout: timeout,
    }).toBe(expectedCount);
}

export function getLivekitRoomsCount(page: Page): Promise<number> {
    return page.evaluate(async () => {
        return window.e2eHooks.getLivekitRoomsCount();
    });
}

export function expectLivekitRoomsCountToBe(page: Page, expectedCount: number, timeout: number = 10000): Promise<void> {
    return expect.poll(async () => {
        return getLivekitRoomsCount(page);
    }, {
        timeout: timeout,
    }).toBe(expectedCount);
}
