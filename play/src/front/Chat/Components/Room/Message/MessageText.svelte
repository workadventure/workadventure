<script lang="ts">
    import type { Readable, Unsubscriber } from "svelte/store";
    import { Marked } from "marked";
    import { onDestroy, onMount } from "svelte";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";
    import { openChatLinkAsCoWebsite } from "../../../Links/ChatLinkOpener";
    import { resolveChatLinkClick } from "../../../Links/ChatLinkPolicy";
    import { sanitizeHTML } from "./WA-HTML-Sanitizer";

    interface Props {
        content: Readable<ChatMessageContent>;
        hasDepth: false;
        updateMessageBody?: () => void;
    }

    let { content, hasDepth, updateMessageBody = () => {} }: Props = $props();

    async function getMarked(body: string): Promise<Marked> {
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

    let html = $state("");

    let unsubscriber: Unsubscriber | undefined;
    onMount(() => {
        unsubscriber = content.subscribe((value) => {
            let promiseHtml = getMarked(value.body).then((marked) => marked.parse(value.body));
            promiseHtml
                .then((result) => {
                    html = result;
                })
                .catch((error) => {
                    console.error("Failed to parse markdown content", error);
                    html = $content.body;
                })
                .finally(() => {
                    updateMessageBody();
                });
        });
    });

    onDestroy(() => {
        if (unsubscriber) {
            unsubscriber();
        }
    });

    let pendingUrl: string | undefined = $state();

    // Delegated so it covers both the links marked builds from plain bodies and the ones
    // already baked into the formatted_body HTML of a reply, which never reach our renderer.
    function onBubbleClick(event: MouseEvent) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement)) {
            return;
        }

        const action = resolveChatLinkClick(anchor, event);
        if (action.kind === "native") {
            return;
        }

        event.preventDefault();

        // Probing embeddability is a round trip; ignore repeat clicks while one is in flight.
        if (pendingUrl !== undefined) {
            return;
        }
        pendingUrl = action.url;

        (async () => {
            try {
                await openChatLinkAsCoWebsite(action.url);
            } finally {
                pendingUrl = undefined;
            }
        })().catch((error) => console.error("Failed to open chat link", error));
    }

    /* eslint-disable svelte/no-at-html-tags */
</script>

<!-- The click target is always a real anchor, which already handles Enter and focus itself. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="message-bubble m-0 {hasDepth ? 'text-xs leading-4' : 'text-sm'} text-white py-1 px-3"
    class:cursor-wait={pendingUrl !== undefined}
    aria-busy={pendingUrl !== undefined}
    lang=""
    onclick={onBubbleClick}
>
    {@html sanitizeHTML(html)}
</div>

<style>
</style>
