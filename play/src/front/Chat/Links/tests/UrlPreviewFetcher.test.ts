import type { IPreviewUrlResponse, MatrixClient } from "matrix-js-sdk";
import { describe, expect, it } from "vitest";
import { metadataFromResponse, previewFromResponse } from "../UrlPreviewFetcher";

const client: Pick<MatrixClient, "mxcUrlToHttp"> = {
    mxcUrlToHttp: (mxc: string, width?: number, height?: number) =>
        width === undefined ? `https://media/${mxc}` : `https://media/${mxc}?w=${width}&h=${height}`,
};

// Loosely typed on purpose: the SDK types og:image:width as a number, but the OpenGraph spec
// says string and real servers send both, which is the whole point of some of these cases.
function response(overrides: Record<string, string | number | undefined>): IPreviewUrlResponse {
    return { "og:title": "", "og:type": "website", "og:url": "", ...overrides };
}

describe("metadataFromResponse", () => {
    it("keeps title, description and site name when the page provides them", () => {
        expect(
            metadataFromResponse(
                response({ "og:title": "A title", "og:description": "A description", "og:site_name": "Example" }),
                "https://example.com/a",
            ),
        ).toEqual({ title: "A title", description: "A description", siteName: "Example" });
    });

    it("falls back to the hostname when there is no site name", () => {
        expect(metadataFromResponse(response({ "og:title": "T" }), "https://news.example.com/a").siteName).toBe(
            "news.example.com",
        );
    });

    it("promotes the description to title when there is no title", () => {
        expect(metadataFromResponse(response({ "og:description": "Only this" }), "https://example.com/a")).toEqual({
            title: "Only this",
            description: undefined,
            siteName: "example.com",
        });
    });

    it("falls back to the site name when there is neither title nor description", () => {
        expect(metadataFromResponse(response({ "og:site_name": "Example" }), "https://example.com/a").title).toBe(
            "Example",
        );
    });

    it("drops a description that merely repeats the site name", () => {
        expect(
            metadataFromResponse(
                response({ "og:title": "T", "og:description": "example", "og:site_name": "Example" }),
                "https://example.com/a",
            ).description,
        ).toBeUndefined();
    });

    it("decodes html entities in the description", () => {
        expect(
            metadataFromResponse(
                response({ "og:title": "T", "og:description": "Ben &amp; Jerry&#39;s" }),
                "https://example.com/a",
            ).description,
        ).toBe("Ben & Jerry's");
    });

    it("ignores blank values", () => {
        expect(
            metadataFromResponse(
                response({ "og:title": "   ", "og:description": "  ", "og:site_name": "Example" }),
                "https://example.com/a",
            ),
        ).toEqual({ title: "Example", description: undefined, siteName: "Example" });
    });
});

describe("previewFromResponse", () => {
    const link = "https://example.com/a";

    // A card whose only content is the URL already shown as a link is worse than no card.
    it("returns null when there is nothing but the link itself", () => {
        expect(previewFromResponse(client, response({ "og:title": link }), link, true)).toBeNull();
    });

    it("keeps a link-titled response that at least has an image", () => {
        const preview = previewFromResponse(
            client,
            response({ "og:title": link, "og:image": "mxc://x/y", "og:image:width": 800, "og:image:height": 400 }),
            link,
            true,
        );
        expect(preview?.image?.src).toBe("https://media/mxc://x/y?w=478&h=200");
    });

    it("renders a large image as a thumbnail", () => {
        const preview = previewFromResponse(
            client,
            response({
                "og:title": "T",
                "og:image": "mxc://x/y",
                "og:image:width": 1200,
                "og:image:height": 630,
                "matrix:image:size": 50000,
            }),
            link,
            true,
        );
        expect(preview?.image).toEqual({
            src: "https://media/mxc://x/y?w=478&h=200",
            width: 478,
            height: 630,
            alt: undefined,
        });
        expect(preview?.siteIcon).toBeUndefined();
    });

    it.each([
        ["too narrow", { "og:image:width": 32, "og:image:height": 320 }],
        ["too short", { "og:image:width": 320, "og:image:height": 32 }],
        ["too few bytes", { "og:image:width": 320, "og:image:height": 320, "matrix:image:size": 512 }],
    ])("treats a %s image as a site icon rather than a thumbnail", (_name, dims) => {
        const preview = previewFromResponse(
            client,
            response({ "og:title": "T", "og:image": "mxc://x/y", ...dims }),
            link,
            true,
        );
        expect(preview?.siteIcon).toBe("https://media/mxc://x/y");
        expect(preview?.image).toBeUndefined();
    });

    it("parses opengraph numbers given as strings", () => {
        const preview = previewFromResponse(
            client,
            response({ "og:title": "T", "og:image": "mxc://x/y", "og:image:width": "1200", "og:image:height": "630" }),
            link,
            true,
        );
        expect(preview?.image?.width).toBe(478);
    });

    // Media is hidden: we still want the text card, just no image request.
    it("omits the image when told not to load media", () => {
        const preview = previewFromResponse(
            client,
            response({ "og:title": "T", "og:image": "mxc://x/y", "og:image:width": 1200, "og:image:height": 630 }),
            link,
            false,
        );
        expect(preview?.title).toBe("T");
        expect(preview?.image).toBeUndefined();
        expect(preview?.siteIcon).toBeUndefined();
    });
});
