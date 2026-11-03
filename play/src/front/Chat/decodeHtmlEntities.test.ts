import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, escapeHtml } from "./decodeHtmlEntities";

describe("decodeHtmlEntities", () => {
    it("decodes what the composer's HTML holds", () => {
        expect(decodeHtmlEntities("parfait&nbsp;")).toBe("parfait\u00a0");
        expect(decodeHtmlEntities("a &amp; b &lt;div&gt; &quot;x&quot;")).toBe('a & b <div> "x"');
        expect(decodeHtmlEntities("&#39;&#x1F600;")).toBe("'😀");
    });

    it("decodes once: an escaped entity stays an entity", () => {
        expect(decodeHtmlEntities("&amp;nbsp;")).toBe("&nbsp;");
    });

    it("leaves plain text and unknown entities alone", () => {
        expect(decodeHtmlEntities("rien à décoder & pas d'entité")).toBe("rien à décoder & pas d'entité");
        expect(decodeHtmlEntities("&copy; &#99999999;")).toBe("&copy; &#99999999;");
    });
});

describe("escapeHtml", () => {
    it("turns text into HTML that shows it as is, and decodeHtmlEntities brings it back", () => {
        const text = 'a & b <img src=x onerror="alert(1)">';
        expect(escapeHtml(text)).toBe('a &amp; b &lt;img src=x onerror="alert(1)"&gt;');
        expect(decodeHtmlEntities(escapeHtml(text))).toBe(text);
    });
});
