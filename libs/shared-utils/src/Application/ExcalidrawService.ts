import { ExcalidrawException } from "./Exception/ExcalidrawException";

/**
 * excalidraw.com is always accepted; self-hosted instances are added through EXCALIDRAW_DOMAINS.
 */
export const validateLink = (url: URL, excalidrawDomains: string[] = []) => {
    if (isExcalidrawLink(url, excalidrawDomains)) return true;
    throw new ExcalidrawException();
};

export const isExcalidrawLink = (url: URL, excalidrawDomains: string[] = []) => {
    return url.hostname === "excalidraw.com" || excalidrawDomains.includes(url.hostname);
};
