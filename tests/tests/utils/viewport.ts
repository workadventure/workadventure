import {Page} from "@playwright/test";

// https://stackoverflow.com/a/68848306
function isIntersectingViewport(selector: string, page: Page): Promise<boolean> {
    return page.$eval(selector, async element => {
        const visibleRatio: number = await new Promise(resolve => {
            const observer = new IntersectionObserver(entries => {
                resolve(entries[0].intersectionRatio);
                observer.disconnect();
            });
            observer.observe(element);
            // Firefox doesn't call IntersectionObserver callback unless
            // there are rafs.
            requestAnimationFrame(() => {});
        });
        return visibleRatio > 0;
    });
}

export async function inViewport(selector: string, page: Page) {
    let inViewport = false;
    let i = 0;
    do {
        inViewport = await isIntersectingViewport(selector, page);
        if (inViewport) {
            break;
        }
        i++;
        await page.waitForTimeout(100);
    } while (i < 50);
    return inViewport;
}

export async function outViewport(selector: string, page: Page) {
    let outViewport = true;
    let i = 0;
    do {
        outViewport = await isIntersectingViewport(selector, page);
        if (!outViewport) {
            break;
        }
        i++;
        await page.waitForTimeout(100);
    } while (i < 50);
    return outViewport;
}
