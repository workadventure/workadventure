import { Marked, type Token } from "marked";

/**
 * Token types that carry no formatting of their own. A message built only out of those renders
 * identically whether or not it goes through Markdown, so it needs no `formatted_body`.
 *
 * Mirrors the TEXT_NODES list of Element's `Markdown.isPlainText()`, which also treats line breaks
 * as plain text.
 */
const PLAIN_TEXT_TOKEN_TYPES = new Set(["paragraph", "text", "space", "br"]);

/**
 * Builds the Marked instance used for every Markdown rendering of the chat, both when serializing an
 * outgoing message and when displaying one. Both sides have to share it: otherwise a message could
 * render differently for its sender and for its receiver.
 */
export async function getMarked(body: string): Promise<Marked> {
    let marked: Marked;

    // Let's lazy load hljs and markedHighlight if the message contains ```.
    if (body.includes("```")) {
        const hljsPromise = import("highlight.js");
        const markedHighlightPromise = import("marked-highlight");
        const [hljsModule, markedHighlightModule] = await Promise.all([hljsPromise, markedHighlightPromise]);

        marked = new Marked(
            markedHighlightModule.markedHighlight({
                langPrefix: "hljs language-",
                highlight(code, lang) {
                    const language = hljsModule.default.getLanguage(lang) ? lang : "plaintext";
                    return hljsModule.default.highlight(code, { language }).value;
                },
            }),
        );
    } else {
        marked = new Marked();
    }

    // Custom renderer for links
    const renderer = new marked.Renderer();
    renderer.link = function ({ href, title, tokens }) {
        const titleAttr = title ? `title="${title}"` : "";
        const text = this.parser.parseInline(tokens);
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr} style="color: white;">${text}</a>`;
    };

    // Apply the custom renderer and enable line breaks
    marked.use({
        renderer,
        breaks: true,
    });

    return marked;
}

/**
 * Renders Markdown to HTML.
 *
 * The result is NOT sanitized: every caller has to run it through DOMPurify before injecting it into
 * the DOM.
 */
export async function renderMarkdown(body: string): Promise<string> {
    const marked = await getMarked(body);
    return marked.parse(body);
}

/**
 * Descends into the inline tokens of each token. Block constructs (list, table, blockquote...) surface
 * under their own token type, so finding one is enough to stop: there is no need to walk their items or
 * rows.
 */
function containsOnlyPlainTextTokens(tokens: Token[]): boolean {
    return tokens.every((token) => {
        if (!PLAIN_TEXT_TOKEN_TYPES.has(token.type)) {
            return false;
        }
        const nestedTokens = "tokens" in token ? token.tokens : undefined;
        return nestedTokens === undefined || containsOnlyPlainTextTokens(nestedTokens);
    });
}

function isPlainText(marked: Marked, body: string): boolean {
    return containsOnlyPlainTextTokens(marked.lexer(body));
}

/**
 * Returns the HTML to put in the `formatted_body` of an outgoing Matrix message, or undefined when
 * `body` is plain text and a formatted body would carry nothing more than the body itself.
 *
 * Omitting it on plain messages is what Element does in `htmlSerializeIfNeeded`: a `formatted_body`
 * that merely repeats the body pushes every receiving client into the HTML path for nothing.
 */
export async function htmlSerializeIfNeeded(body: string): Promise<string | undefined> {
    const marked = await getMarked(body);
    if (isPlainText(marked, body)) {
        return undefined;
    }
    return marked.parse(body);
}
