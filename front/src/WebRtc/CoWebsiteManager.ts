import {HtmlUtils} from "./HtmlUtils";
import {Subject} from "rxjs";

enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}

const cowebsiteDivId = 'cowebsite'; // the id of the whole container.
const cowebsiteMainDomId = 'cowebsite-main'; // the id of the parent div of the iframe.
const cowebsiteAsideDomId = 'cowebsite-aside'; // the id of the parent div of the iframe.
const cowebsiteCloseButtonId = 'cowebsite-close';
const animationTime = 500; //time used by the css transitions, in ms.

class CoWebsiteManager {
    
    private opened: iframeStates = iframeStates.closed; 

    private _onStateChange: Subject<void> = new Subject();
    public onStateChange = this._onStateChange.asObservable();
    /**
     * Quickly going in and out of an iframe trigger can create conflicts between the iframe states.
     * So we use this promise to queue up every cowebsite state transition
     */
    private currentOperationPromise: Promise<void> = Promise.resolve();
    private cowebsiteDiv: HTMLDivElement; 
    private resizing: boolean = false;
    private currentWidth: number = 0;
    private cowebsiteMainDom: HTMLDivElement;
    private cowebsiteAsideDom: HTMLDivElement;
    
    get width(): number {
        return this.cowebsiteDiv.clientWidth;
    }

    set width(width: number) {
        this.cowebsiteDiv.style.width = width+'px';
    }
    
    constructor() {
        this.cowebsiteDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDivId);
        this.cowebsiteMainDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteMainDomId);
        this.cowebsiteAsideDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideDomId);

        this.initResizeListeners();

        HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId).addEventListener('click', () => {
            this.closeCoWebsite();
        });
    }

    private initResizeListeners() {
        this.cowebsiteAsideDom.addEventListener('mousedown', (event) => {
            this.resizing = true;
            this.getIframeDom().style.display = 'none';

            document.onmousemove = (event) => {
                this.width = this.width - event.movementX;
                this.fire();
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (!this.resizing) return;
            document.onmousemove = null;
            this.getIframeDom().style.display = 'block';
            this.resizing = false;
        });
    }

    private close(): void {
        this.cowebsiteDiv.classList.remove('loaded'); //edit the css class to trigger the transition
        this.cowebsiteDiv.classList.add('hidden');
        this.opened = iframeStates.closed;
    }
    private load(): void {
        this.cowebsiteDiv.classList.remove('hidden'); //edit the css class to trigger the transition
        this.cowebsiteDiv.classList.add('loading');
        this.opened = iframeStates.loading;
    }
    private open(): void {
        this.cowebsiteDiv.classList.remove('loading', 'hidden'); //edit the css class to trigger the transition
        this.opened = iframeStates.opened;
        this.resetWidth();
    }

    private resetWidth() {
        this.width = window.innerWidth / 2;
    }

    private getIframeDom(): HTMLIFrameElement {
        const iframe = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDivId).querySelector('iframe');
        if (!iframe) throw new Error('Could not find iframe!');
        return iframe;
    }

    public loadCoWebsite(url: string, base: string, allowPolicy?: string): void {
        this.load();
        this.cowebsiteMainDom.innerHTML = ``;

        const iframe = document.createElement('iframe');
        iframe.id = 'cowebsite-iframe';
        iframe.src = (new URL(url, base)).toString();
        if (allowPolicy) {
            iframe.allow = allowPolicy; 
        }
        const onloadPromise = new Promise((resolve) => {
            iframe.onload = () => resolve();
        });
        this.cowebsiteMainDom.appendChild(iframe);
        const onTimeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(), 2000);
        });
        this.currentOperationPromise = this.currentOperationPromise.then(() =>Promise.race([onloadPromise, onTimeoutPromise])).then(() => {
            this.open();
            setTimeout(() => {
                this.fire();
            }, animationTime)
        }).catch(() => this.closeCoWebsite());
    }

    /**
     * Just like loadCoWebsite but the div can be filled by the user.
     */
    public insertCoWebsite(callback: (cowebsite: HTMLDivElement) => Promise<void>): void {
        this.load();
        this.currentOperationPromise = this.currentOperationPromise.then(() => callback(this.cowebsiteDiv)).then(() => {
            this.open();
            setTimeout(() => {
                this.fire();
            }, animationTime);
        }).catch(() => this.closeCoWebsite());
    }

    public closeCoWebsite(): Promise<void> {
        this.currentOperationPromise = this.currentOperationPromise.then(() => new Promise((resolve, reject) => {
            if(this.opened === iframeStates.closed) resolve(); //this method may be called twice, in case of iframe error for example
            this.close();
            this.fire();
            setTimeout(() => {
                this.cowebsiteMainDom.innerHTML = ``;
                resolve();
            }, animationTime)
        }));
        return this.currentOperationPromise;
    }

    public getGameSize(): {width: number, height: number} {
        if (this.opened !== iframeStates.opened) {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            }
        }
        if (window.innerWidth >= window.innerHeight) {
            return {
                width: window.innerWidth - this.width,
                height: window.innerHeight
            }
        } else {
            return {
                width: window.innerWidth,
                height: window.innerHeight / 2
            }
        }
    }
    
    private fire(): void {
        this._onStateChange.next();
    }
}

export const coWebsiteManager = new CoWebsiteManager();