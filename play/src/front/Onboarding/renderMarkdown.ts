import { marked } from "marked";
import { sanitizeHtml } from "../Utils/HtmlSanitizer";

/** Markdown has no syntax for a video: an image whose file is a video plays as one, as on GitHub. */
const VIDEO_FILE = /\.(mp4|webm)([?#]|$)/i;

/** The text of an onboarding step, sanitized. */
export function renderMarkdown(text: string): string {
    const template = document.createElement("template");
    template.innerHTML = sanitizeHtml(marked.parse(text, { async: false }));
    // In the same tab, a link would take the user out of the world.
    for (const link of template.content.querySelectorAll("a")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }
    for (const image of template.content.querySelectorAll("img")) {
        const src = image.getAttribute("src");
        if (!src || !VIDEO_FILE.test(src)) {
            continue;
        }
        const video = document.createElement("video");
        // Attributes, not properties: the HTML string is all that is kept. The path stays as written, resolved once
        // the video is in the page.
        video.setAttribute("src", src);
        for (const attribute of ["autoplay", "muted", "loop", "playsinline"]) {
            video.setAttribute(attribute, "");
        }
        if (image.alt) {
            video.setAttribute("aria-label", image.alt);
        }
        image.replaceWith(video);
    }
    return template.innerHTML;
}

/**
 * The pages of a modal's text, rendered: a `---` line starts a new page, as in Markdown slides. Split on the
 * rendered HTML, so a `---` in a code block, or right under a line of text (which makes that line a heading), does not
 * count.
 */
export function renderPages(text: string): string[] {
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(text);
    const pages = [document.createElement("div")];
    for (const node of [...template.content.childNodes]) {
        if (node.nodeName === "HR") {
            pages.push(document.createElement("div"));
        } else {
            pages[pages.length - 1].append(node);
        }
    }
    const html = pages.map((page) => page.innerHTML.trim()).filter((page) => page !== "");
    return html.length > 0 ? html : [""];
}
