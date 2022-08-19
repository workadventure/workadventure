import {FrameLocator, Page} from "@playwright/test";

export function getCoWebsiteIframe(page: Page): FrameLocator {
    return page.frameLocator('#cowebsite-buffer iframe');
}
