import {Page} from "@playwright/test";

// https://stackoverflow.com/a/68848306
export function isIntersectingViewport(selector: string, page: Page): Promise<boolean> {
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
