import {FrameLocator, Page} from "@playwright/test";


export function getCoWebsiteIframe(page: Page): FrameLocator {
    return page.locator('iframe[title="Cowebsite"]:visible').contentFrame();
}