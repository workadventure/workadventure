/**
 * Our composer is contenteditable and sends its HTML as the message body: "a & b " goes out as "a &amp; b&nbsp;".
 * The timeline renders that body as markdown, which decodes it, but wherever it is shown as plain text (list
 * preview, banner, notification, copy) the entities must be decoded. Not into innerHTML: the result is raw text.
 */
export function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&nbsp;/g, "\u00a0")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (entity, code: string) => codePointOrEntity(entity, Number(code)))
        .replace(/&#x([\da-f]+);/gi, (entity, code: string) => codePointOrEntity(entity, parseInt(code, 16)))
        .replace(/&amp;/g, "&");
}

function codePointOrEntity(entity: string, codePoint: number): string {
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
}
