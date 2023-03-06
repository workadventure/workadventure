import type CancelablePromise from "cancelable-promise";
import type { Readable } from "svelte/store";
import { z } from "zod";

export const CoWebsiteState = z.enum(["asleep", "loading", "ready"]);
export type CoWebsiteState = z.infer<typeof CoWebsiteState>;

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
