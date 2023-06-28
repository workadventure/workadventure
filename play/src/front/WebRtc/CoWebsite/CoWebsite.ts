import type CancelablePromise from "cancelable-promise";
import type { Readable } from "svelte/store";

export type CoWebsiteState = "asleep" | "loading" | "ready";

export interface CoWebsite {
    getId(): string;
    getUrl(): URL;
    getState(): CoWebsiteState;
    getStateSubscriber(): Readable<CoWebsiteState>;
    getIframe(): HTMLIFrameElement | undefined;
    getLoadIframe(): CancelablePromise<HTMLIFrameElement> | undefined;
    getWidthPercent(): number | undefined;
    isClosable(): boolean;
    load(): CancelablePromise<HTMLIFrameElement>;
    unload(): Promise<void>;
}
