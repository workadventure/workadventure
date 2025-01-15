import {FrameLocator, Page} from "@playwright/test";


export function getCoWebsiteIframe(page: Page): FrameLocator {
    return page.locator('iframe[title="Cowebsite"]').contentFrame();
}

//locator('iframe[title="Cowebsite"]').contentFrame().getByText('New user: Bob')
// Original function
/*export function getCoWebsiteIframe(page: Page): FrameLocator {
    return page.frameLocator('#cowebsites-container iframe');
}*/
