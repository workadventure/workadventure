import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import {
    getYoutubeEmbedUrl,
    isEmbeddableYoutubeLink,
    isYoutubeLink,
    validateYoutubeLink,
} from "../../src/Application/YoutubeService";
import { YoutubeException } from "../../src/Application/Exception/YoutubeException";

describe("isYoutubeLink", () => {
    it.each([
        "https://youtu.be/6ZfuNTqbHE8",
        "https://www.youtube.com/watch?v=6ZfuNTqbHE8",
        "https://youtube.com/watch?v=6ZfuNTqbHE8",
        "https://m.youtube.com/watch?v=6ZfuNTqbHE8",
        "https://www.youtube-nocookie.com/embed/6ZfuNTqbHE8",
    ])("recognises %s", (link) => {
        expect(isYoutubeLink(new URL(link))).toBe(true);
    });

    it.each(["https://example.com/?q=youtube", "https://not-youtube.evil.com/", "https://vimeo.com/123"])(
        "rejects %s",
        (link) => {
            expect(isYoutubeLink(new URL(link))).toBe(false);
        },
    );
});

describe("isEmbeddableYoutubeLink", () => {
    it("only accepts the /embed/ path", () => {
        expect(isEmbeddableYoutubeLink(new URL("https://www.youtube.com/embed/6ZfuNTqbHE8"))).toBe(true);
        expect(isEmbeddableYoutubeLink(new URL("https://www.youtube.com/watch?v=embed"))).toBe(false);
    });
});

describe("validateYoutubeLink", () => {
    it("throws a YoutubeException on a non YouTube link", () => {
        expect(() => validateYoutubeLink(new URL("https://example.com"))).toThrow(YoutubeException);
        expect(() => validateYoutubeLink(new URL("https://youtu.be/6ZfuNTqbHE8"))).not.toThrow();
    });
});

describe("getYoutubeEmbedUrl", () => {
    const oembed = vi.spyOn(axios, "get");
    afterEach(() => oembed.mockReset());

    it("keeps an embed link as is without asking YouTube", async () => {
        await expect(getYoutubeEmbedUrl(new URL("https://www.youtube.com/embed/6ZfuNTqbHE8"))).resolves.toBe(
            "https://www.youtube.com/embed/6ZfuNTqbHE8",
        );
        expect(oembed).not.toHaveBeenCalled();
    });

    it("returns undefined when YouTube has no embed form for the video", async () => {
        oembed.mockRejectedValueOnce(new Error("Request failed with status code 401"));
        await expect(getYoutubeEmbedUrl(new URL("https://youtu.be/private"))).resolves.toBeUndefined();
    });
});
