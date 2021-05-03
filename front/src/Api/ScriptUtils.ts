import {coWebsiteManager} from "../WebRtc/CoWebsiteManager";
import { OpenCoWebSiteOptionsEvent } from './Events/OpenCoWebSiteEvent';

class ScriptUtils {

    public openTab(url : string){
        window.open(url);
    }

    public goToPage(url : string){
         window.location.href = url;

    }

    public openCoWebsite(url: string, base: string, scriptWindow: MessageEventSource | null, options?: OpenCoWebSiteOptionsEvent|undefined) {
        const iframeWindow = coWebsiteManager.loadCoWebsite(url, base, undefined, undefined, options);
        if (scriptWindow && iframeWindow) {
            const messgaeChannel = new MessageChannel()
            window.addEventListener("message", (event: MessageEvent) => {
                if (event.source === scriptWindow) {
                    iframeWindow.postMessage(event.data, "*")
                } else if (event.source === iframeWindow) {
                    (scriptWindow as Window).postMessage(event.data, "*")
                }
            })
        }
    }

    public closeCoWebSite(){
        coWebsiteManager.closeCoWebsite();
    }
}

export const scriptUtils = new ScriptUtils();
