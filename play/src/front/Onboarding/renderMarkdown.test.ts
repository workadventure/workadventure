import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./renderMarkdown";

function render(text: string): DocumentFragment {
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(text);
    return template.content;
}

describe("renderMarkdown", () => {
    it("opens links in a new tab", () => {
        const link = render("[Read more](https://example.com/)").querySelector("a");
        expect(link?.getAttribute("target")).toBe("_blank");
        expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("plays a video file written as an image, muted and in a loop", () => {
        const html = render("![Drag the map](./static/Videos/LockBubble.mp4)");
        expect(html.querySelector("img")).toBeNull();
        const video = html.querySelector("video");
        expect(video?.getAttribute("src")).toBe("./static/Videos/LockBubble.mp4");
        expect(video?.getAttribute("aria-label")).toBe("Drag the map");
        for (const attribute of ["autoplay", "muted", "loop", "playsinline"]) {
            expect(video?.hasAttribute(attribute)).toBe(true);
        }
    });

    it("keeps an image as an image", () => {
        const image = render("![The tray](./static/images/tray.webp)").querySelector("img");
        expect(image?.getAttribute("src")).toBe("./static/images/tray.webp");
        expect(render("![](./static/images/tray.webp)").querySelector("video")).toBeNull();
    });

    it("sanitizes the HTML", () => {
        const html = render('<img src="x.png" onerror="alert(1)"><script>alert(2)</script>');
        expect(html.querySelector("script")).toBeNull();
        expect(html.querySelector("img")?.hasAttribute("onerror")).toBe(false);
    });
});
