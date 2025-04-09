import type CancelablePromise from "cancelable-promise";

export interface CoWebsite {
    getId(): string;
    getUrl(): URL;
    getIframe(): HTMLIFrameElement | undefined;
    getLoadIframe(): CancelablePromise<HTMLIFrameElement> | undefined;
    getWidthPercent(): number | undefined;
    isClosable(): boolean;
}
