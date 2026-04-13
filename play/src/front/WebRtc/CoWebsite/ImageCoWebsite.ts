import { SimpleCoWebsite } from "./SimpleCoWebsite";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];

export function isImageCoWebsiteUrl(url: URL): boolean {
    const pathname = url.pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

export function getImageCoWebsiteTitle(url: URL): string {
    const filename = url.pathname.split("/").pop();
    if (!filename) {
        return "Image";
    }

    const decodedFilename = decodeURIComponent(filename);
    return decodedFilename.replace(/\.[^.]+$/, "");
}

export class ImageCoWebsite extends SimpleCoWebsite {
    constructor(url: URL, public readonly title: string, widthPercent?: number, closable?: boolean, hideUrl?: boolean) {
        super(url, false, undefined, widthPercent, closable, hideUrl);
        this.id = "image-" + this.id;
    }

    public getTitle(): string {
        return this.title;
    }

    public getIcon(): string {
        return this.getUrl().toString();
    }
}
