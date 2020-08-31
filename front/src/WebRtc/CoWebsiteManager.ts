import {HtmlUtils} from "./HtmlUtils";

export type CoWebsiteStateChangedCallback = () => void;

export class CoWebsiteManager {

    private static observers = new Array<CoWebsiteStateChangedCallback>();

    public static loadCoWebsite(url: string): void {
        const cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite");
        cowebsiteDiv.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.id = 'cowebsite-iframe';
        iframe.src = url;
        cowebsiteDiv.appendChild(iframe);
        //iframe.onload = () => {
            // onload can be long to trigger. Maybe we should display the website, whatever happens, after 1 second?
            CoWebsiteManager.fire();
        //}
    }

    /**
     * Just like loadCoWebsite but the div can be filled by the user.
     */
    public static insertCoWebsite(callback: (cowebsite: HTMLDivElement) => void): void {
        const cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite");
        cowebsiteDiv.innerHTML = '';

        callback(cowebsiteDiv);
        //iframe.onload = () => {
        // onload can be long to trigger. Maybe we should display the website, whatever happens, after 1 second?
        CoWebsiteManager.fire();
        //}
    }

    public static closeCoWebsite(): void {
        const cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite");
        cowebsiteDiv.innerHTML = '';
        CoWebsiteManager.fire();
    }

    public static getGameSize(): {width: number, height: number} {
        const hasChildren = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite").children.length > 0;
        if (hasChildren === false) {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            }
        }
        if (window.innerWidth >= window.innerHeight) {
            return {
                width: window.innerWidth / 2,
                height: window.innerHeight
            }
        } else {
            return {
                width: window.innerWidth,
                height: window.innerHeight / 2
            }
        }
    }

    public static onStateChange(observer: CoWebsiteStateChangedCallback) {
        CoWebsiteManager.observers.push(observer);
    }

    private static fire(): void {
        for (const callback of CoWebsiteManager.observers) {
            callback();
        }
    }
}
