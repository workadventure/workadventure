import { SimpleCoWebsite } from "./SimpleCoWebsite";

/**
 * A CoWebsite implementation for displaying video content from signed S3 URLs.
 * Unlike other cowebsites that use iframes, this one renders a native HTML5 video element.
 */
export class VideoCoWebsite extends SimpleCoWebsite {
    constructor(url: URL, public readonly title: string, widthPercent?: number, closable?: boolean) {
        // hideUrl = true because signed S3 URLs are long and ugly
        super(url, false, undefined, widthPercent, closable, true);
        this.id = "video-" + this.id;
    }
}
