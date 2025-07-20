import { getYoutubeEmbedUrl } from "./YoutubeService";

describe("YoutubeService", () => {
    it("should return the correct embed URL for a youtube video", async () => {
        const url = new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        const embedUrl = await getYoutubeEmbedUrl(url);
        expect(embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed");
    });
});
