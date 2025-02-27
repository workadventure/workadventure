import DOMPurify from "dompurify";

DOMPurify.addHook("afterSanitizeAttributes", function (node) {
    if ("target" in node) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
    }
});

export const sanitizeHTML = (html: string | Node): string => {
    return DOMPurify.sanitize(html);
};
