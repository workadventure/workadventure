import { coWebsiteManager } from "../WebRtc/CoWebsiteManager";

class ScriptUtils {
    public openTab(url: string) {
        window.open(url);
    }

    public goToPage(url: string) {
        window.location.href = url;
    }

    public openCoWebsite(url: string, base: string, api: boolean, policy: string) {
        coWebsiteManager.loadCoWebsite(url, base, api, policy);
    }

    public closeCoWebSite() {
        coWebsiteManager.closeCoWebsite();
    }
}

export const scriptUtils = new ScriptUtils();
