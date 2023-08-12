import { EraserLinkException } from "./Exception/EraserException";

export const validateEraserLink = (url: URL) => {
    if (url.hostname === "app.eraser.io") return true;
    throw new EraserLinkException();
};
