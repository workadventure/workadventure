import { ExcalidrawException } from "./Exception/ExcalidrawException.ts";

export const validateLink = (url: URL, excalidrawDomains = ["excalidraw.com"]) => {
    if (isExcalidrawLink(url, excalidrawDomains)) return true;
    throw new ExcalidrawException();
};

export const isExcalidrawLink = (url: URL, excalidrawDomains = ["excalidraw.com"]) => {
    return excalidrawDomains?.includes(url.hostname);
};
