import { EraserLinkException } from "./Exception/EraserException";

export const validateEraserLink = (url: URL) => {
    if (isEraserLink(url)) return true;
    throw new EraserLinkException();
};

export const isEraserLink = (url: URL) => {
    return url.hostname === "app.eraser.io";
};
