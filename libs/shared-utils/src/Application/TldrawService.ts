import { TldrawLinkException } from "./Exception/TldrawException.ts";

export const validateLink = (url: URL) => {
    if (isTldrawLink(url)) return true;
    throw new TldrawLinkException();
};

export const isTldrawLink = (url: URL) => {
    return url.hostname.includes("tldraw.com");
};
