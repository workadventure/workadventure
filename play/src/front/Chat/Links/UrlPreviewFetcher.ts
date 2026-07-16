import type { IPreviewUrlResponse, MatrixClient } from "matrix-js-sdk";

export const PREVIEW_WIDTH_PX = 478;
export const PREVIEW_HEIGHT_PX = 200;
/** Below this, the image is a favicon rather than a thumbnail worth showing full width. */
const MIN_PREVIEW_PX = 96;
const MIN_IMAGE_SIZE_BYTES = 8192;

export interface UrlPreviewImage {
    src: string;
    width?: number;
    height?: number;
    alt?: string;
}

export interface UrlPreview {
    link: string;
    title: string;
    siteName: string;
    description?: string;
    /** A thumbnail worth showing full width. Mutually exclusive with siteIcon in practice. */
    image?: UrlPreviewImage;
    /** A favicon-sized image, for the compact card. */
    siteIcon?: string;
}

/**
 * OpenGraph declares every value a string, but Synapse hands some back as numbers.
 */
function numberFromOpenGraph(value: string | number | undefined): number | undefined {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string" && value !== "") {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return undefined;
}

function trimmedString(value: string | number | undefined): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}

function decodeEntities(value: string): string {
    const element = document.createElement("textarea");
    element.innerHTML = value;
    return element.value;
}

/**
 * Picks the best title/description/site name an OpenGraph response can support.
 *
 * Pages lie by omission constantly, hence the cascade: a card with a URL for a title and
 * nothing else is worse than no card at all, which is what `null` from fetchPreview means.
 */
export function metadataFromResponse(
    response: IPreviewUrlResponse,
    link: string,
): Pick<UrlPreview, "title" | "description" | "siteName"> {
    let title = trimmedString(response["og:title"]);
    let description = trimmedString(response["og:description"]);
    const siteName = trimmedString(response["og:site_name"]) ?? new URL(link).hostname;

    if (title === undefined && description !== undefined) {
        title = description;
        description = undefined;
    } else if (title === undefined) {
        title = siteName;
    }

    // A description that just repeats the site name is filler.
    if (description !== undefined && description.toLowerCase() === siteName.toLowerCase()) {
        description = undefined;
    }

    return { title, description: description === undefined ? undefined : decodeEntities(description), siteName };
}

function isThumbnail(width: number | undefined, height: number | undefined, bytes: number | undefined): boolean {
    if (width !== undefined && width < MIN_PREVIEW_PX) {
        return false;
    }
    if (height !== undefined && height < MIN_PREVIEW_PX) {
        return false;
    }
    if (bytes !== undefined && bytes < MIN_IMAGE_SIZE_BYTES) {
        return false;
    }
    return true;
}

/**
 * Turns an OpenGraph response into something renderable, or null when there is nothing
 * worth showing.
 */
export function previewFromResponse(
    client: Pick<MatrixClient, "mxcUrlToHttp">,
    response: IPreviewUrlResponse,
    link: string,
    loadImage: boolean,
): UrlPreview | null {
    const { title, description, siteName } = metadataFromResponse(response, link);
    const mxcImage = trimmedString(response["og:image"]);

    // Nothing but the URL we already show as a link.
    if (title === link && mxcImage === undefined) {
        return null;
    }

    const preview: UrlPreview = { link, title, siteName, description };
    if (mxcImage === undefined || !loadImage) {
        return preview;
    }

    const width = numberFromOpenGraph(response["og:image:width"]);
    const height = numberFromOpenGraph(response["og:image:height"]);
    const bytes = numberFromOpenGraph(response["matrix:image:size"]);

    if (isThumbnail(width, height, bytes)) {
        const src = client.mxcUrlToHttp(mxcImage, PREVIEW_WIDTH_PX, PREVIEW_HEIGHT_PX, "scale");
        if (src !== null) {
            preview.image = {
                src,
                width: width === undefined ? undefined : Math.min(width, PREVIEW_WIDTH_PX),
                height,
                alt: trimmedString(response["og:image:alt"]),
            };
        }
        return preview;
    }

    const icon = client.mxcUrlToHttp(mxcImage);
    if (icon !== null) {
        preview.siteIcon = icon;
    }
    return preview;
}

/**
 * Fetches link previews from the homeserver, one per link, remembering what it already asked.
 */
export class UrlPreviewFetcher {
    private readonly cache = new Map<string, UrlPreview | null>();

    public constructor(private readonly client: MatrixClient, private readonly eventTimestamp: number) {}

    public async fetchPreview(link: string, loadImage: boolean): Promise<UrlPreview | null> {
        const cached = this.cache.get(link);
        if (cached !== undefined) {
            return cached;
        }

        let response: IPreviewUrlResponse;
        try {
            response = await this.client.getUrlPreview(link, this.eventTimestamp);
        } catch (error) {
            // A page with no OpenGraph tags is the common case, not a fault worth shouting about.
            console.debug("No URL preview available for", link, error);
            return null;
        }

        const preview = previewFromResponse(this.client, response, link, loadImage);
        this.cache.set(link, preview);
        return preview;
    }
}
