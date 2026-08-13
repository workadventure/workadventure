import DOMPurify from "dompurify";

/**
 * Sanitizes a HTML string before it is injected in the DOM through `innerHTML`.
 *
 * The default DOMPurify profile is used: it keeps regular HTML and the inline SVG we generate
 * (the keyboard badges of the speech bubbles), and drops scripts, event handlers and
 * "javascript:" URLs.
 */
export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html);
}
