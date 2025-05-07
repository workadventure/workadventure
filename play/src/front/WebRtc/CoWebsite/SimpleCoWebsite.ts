import CancelablePromise from "cancelable-promise";
import { coWebsiteManager } from "../../Stores/CoWebsiteStore";
import type { CoWebsite } from "./CoWebsite";

export class SimpleCoWebsite implements CoWebsite {
    protected id: string;
    protected url: URL;
    protected iframe?: HTMLIFrameElement;
    protected loadIframe?: CancelablePromise<HTMLIFrameElement>;
    protected allowApi?: boolean;
    protected allowPolicy?: string;
    protected widthPercent?: number;
    protected closable: boolean;

    constructor(url: URL, allowApi?: boolean, allowPolicy?: string, widthPercent?: number, closable?: boolean) {
        this.id = coWebsiteManager.generateUniqueId();
        this.url = url;
        this.allowApi = allowApi;
        this.allowPolicy = allowPolicy;
        this.widthPercent = widthPercent;
        this.closable = closable ?? true;
    }

    getId(): string {
        return this.id;
    }

    getUrl(): URL {
        return this.url;
    }

    getIframe(): HTMLIFrameElement | undefined {
        return this.iframe;
    }

    getLoadIframe(): CancelablePromise<HTMLIFrameElement> | undefined {
        return this.loadIframe;
    }

    getWidthPercent(): number | undefined {
        return this.widthPercent;
    }

    isClosable(): boolean {
        return this.closable;
    }

    getAllowPolicy(): string | undefined {
        return this.allowPolicy;
    }

    getAllowApi(): boolean {
        return this.allowApi ?? false;
    }
}
