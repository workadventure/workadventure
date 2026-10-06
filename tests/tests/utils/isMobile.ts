import type { Page, ViewportSize } from "@playwright/test";

/*
 * A width of 1280 and a height of 720 is Playwright's desktop default; anything smaller is a phone.
 * TODO adapt to make the difference between tablet and phone
 */

/**
 * Prefer this over `isMobile()` in `test.beforeEach` hooks and test signatures: `viewport` is a test
 * option, so reading it costs nothing, whereas destructuring `page` makes Playwright build a whole
 * browser context and page for every test in the file just to read its configured size.
 */
export function isMobileViewport(viewport: ViewportSize | null): boolean {
    return viewport !== null && viewport.width < 1280 && viewport.height < 750;
}

/** Returns true if the page is sized like a phone. */
export function isMobile(page: Page): boolean {
    return isMobileViewport(page.viewportSize());
}
