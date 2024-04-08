import { ExcalidrawException } from "./Exception/ExcalidrawException";

export const validateLink = (url: URL) => {
    if (isExcalidrawLink(url)) return true;
    throw new ExcalidrawException();
};

export const isExcalidrawLink = (url: URL) => {
    return (
        url.hostname === "excalidraw.com" ||
        url.hostname === "excalidraw.workadventu.re" ||
        url.hostname === "excalidraw.staging.workadventu.re" ||
        url.hostname === "excalidraw.workadventure.localhost"
    );
};
