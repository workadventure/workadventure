import {expect, Page} from "@playwright/test";

// https://stackoverflow.com/a/68848306
function isIntersectingViewport(selector: string, page: Page): Promise<boolean> {
    return page.locator(selector).evaluate(async element => {
        const visibleRatio: number = await new Promise(resolve => {
            const observer = new IntersectionObserver(entries => {
                resolve(entries[0].intersectionRatio);
                observer.disconnect();
            });
            observer.observe(element);
            // Firefox doesn't call IntersectionObserver callback unless
            // there are rafs.
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            requestAnimationFrame(() => {});
        });
        return visibleRatio > 0;
    });
}

export async function expectInViewport(selector: string, page: Page) {
    // FIXME: why not use "isVisible"???
    await expect.poll(() => isIntersectingViewport(selector, page)).toBeTruthy();
}

export async function expectOutViewport(selector: string, page: Page) {
    // FIXME: why not use "isNotVisible"???
    await expect.poll(() => isIntersectingViewport(selector, page)).toBeFalsy();
}
