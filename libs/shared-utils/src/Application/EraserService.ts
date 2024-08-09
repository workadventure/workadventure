import { EraserLinkException } from "./Exception/EraserException";

export const validateLink = (url: URL) => {
    if (isEraserLink(url)) return true;
    throw new EraserLinkException();
};

export const isEraserLink = (url: URL) => {
    return url.hostname === "app.eraser.io";
};
