import {coWebsiteManager} from "../WebRtc/CoWebsiteManager";

class ScriptUtils {

    public openTab(url : string){
        window.open(url);
    }

    public goToPage(url : string){
         window.location.href = url;

    }

    public openCoWebsite(url: string, base: string, allowApi: boolean, allowPolicy: string) {
           coWebsiteManager.loadCoWebsite(url, base, allowApi, allowPolicy);
    }

    public closeCoWebSite(){
        coWebsiteManager.closeCoWebsite();
    }
}

export const scriptUtils = new ScriptUtils();
