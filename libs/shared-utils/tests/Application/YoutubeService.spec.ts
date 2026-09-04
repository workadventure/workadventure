import { describe, expect, it } from "vitest";
import { isEmbeddableYoutubeLink, isYoutubeLink, validateYoutubeLink } from "../../src/Application/YoutubeService";
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
