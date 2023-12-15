import CancelablePromise from "cancelable-promise";
import type { Readable, Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import { iframeListener } from "../../Api/IframeListener";
import { coWebsiteManager } from "../CoWebsiteManager";
import type { CoWebsite, CoWebsiteState } from "./CoWebsite";

export class SimpleCoWebsite implements CoWebsite {
    protected id: string;
    protected url: URL;
    protected state: Writable<CoWebsiteState>;
    protected iframe?: HTMLIFrameElement;
    protected loadIframe?: CancelablePromise<HTMLIFrameElement>;
    protected allowApi?: boolean;
    protected allowPolicy?: string;
    protected widthPercent?: number;
    protected closable: boolean;

    constructor(url: URL, allowApi?: boolean, allowPolicy?: string, widthPercent?: number, closable?: boolean) {
        this.id = coWebsiteManager.generateUniqueId();
        this.url = url;
        this.state = writable("asleep");
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

    getState(): CoWebsiteState {
        return get(this.state);
    }

    getStateSubscriber(): Readable<CoWebsiteState> {
        return this.state;
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

    load(): CancelablePromise<HTMLIFrameElement> {
        this.loadIframe = new CancelablePromise((resolve, reject, cancel) => {
            this.state.set("loading");

            const iframe = document.createElement("iframe");
            this.iframe = iframe;
            this.iframe.src = this.url.toString();
            this.iframe.id = this.id;

            if (this.allowPolicy) {
                this.iframe.allow = this.allowPolicy;
            }

            if (this.allowApi) {
                iframeListener.registerIframe(this.iframe);
            }

            this.iframe.classList.add("pixel");
            this.iframe.style.backgroundColor = "white";

            const onloadPromise = new Promise<void>((resolve) => {
                if (this.iframe) {
                    this.iframe.onload = () => {
                        this.state.set("ready");
                        resolve();
                    };
                }
            });

            const onTimeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 2000);
            });

            coWebsiteManager.getCoWebsiteBuffer().appendChild(this.iframe);

            const race = CancelablePromise.race([onloadPromise, onTimeoutPromise])
                .then(() => {
                    return resolve(iframe);
                })
                .catch((err) => {
                    console.error("Error on co-website loading => ", err);
                    return reject();
                });

            cancel(() => {
                race.cancel();
                this.unload().catch((err) => {
                    console.error("Cannot unload co-website while cancel loading", err);
                });
            });
        });

        return this.loadIframe;
    }

    unload(): Promise<void> {
        return new Promise((resolve) => {
            if (this.iframe) {
                if (this.allowApi) {
                    iframeListener.unregisterIframe(this.iframe);
                }
                this.iframe.parentNode?.removeChild(this.iframe);
            }

            if (this.loadIframe) {
                this.loadIframe.cancel();
                this.loadIframe = undefined;
            }

            this.state.set("asleep");

            resolve();
        });
    }
}
