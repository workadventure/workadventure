<script lang="ts">
    import type { Readable, Unsubscriber } from "svelte/store";
    import { Marked } from "marked";
    import { onDestroy, onMount, tick } from "svelte";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";
    import { sanitizeHTML } from "./WA-HTML-Sanitizer";
    import { isMessageLongerThanCollapsedHeight } from "./MessageTextLayout";

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
    let expanded = $state(false);
    let isLongMessage = $state(false);
    let messageBubbleElement: HTMLDivElement | undefined = $state();

    let unsubscriber: Unsubscriber | undefined;
    onMount(() => {
        unsubscriber = content.subscribe((value) => {
            expanded = false;
            let promiseHtml = getMarked(value.body).then((marked) => marked.parse(value.body));
            promiseHtml
                .then((result) => {
                    html = result;
                    tick()
                        .then(updateLongMessageState)
                        .catch((error) => console.error("Failed to measure chat message", error));
                })
                .catch((error) => {
                    console.error("Failed to parse markdown content", error);
                    html = $content.body;
                    tick()
                        .then(updateLongMessageState)
                        .catch((error) => console.error("Failed to measure chat message", error));
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

    $effect(() => {
        // Re-run the measurement whenever the rendered html or the expanded state changes
        // (updateLongMessageState itself only reads the DOM element).
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        html;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expanded;
        updateLongMessageState();
    });

    function updateLongMessageState() {
        if (!messageBubbleElement) {
            return;
        }

        const lineHeight = Number.parseFloat(getComputedStyle(messageBubbleElement).lineHeight);
        isLongMessage = isMessageLongerThanCollapsedHeight(messageBubbleElement.scrollHeight, lineHeight);
    }

    /* eslint-disable svelte/no-at-html-tags */
</script>

<div
    class="message-bubble m-0 {hasDepth ? 'text-xs leading-4' : 'text-sm'} text-white py-1 px-3"
    class:collapsed-message={isLongMessage && !expanded}
    bind:this={messageBubbleElement}
    lang=""
>
    {@html sanitizeHTML(html)}
</div>
{#if isLongMessage}
    <button
        type="button"
        class="m-0 px-3 pb-1 pt-0 text-xs font-semibold text-white/70 hover:text-white"
        onclick={() => (expanded = !expanded)}
    >
        {expanded ? $LL.chat.showLessMessage() : $LL.chat.showFullMessage()}
    </button>
{/if}

<style>
    .collapsed-message {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 8;
        line-clamp: 8;
        overflow: hidden;
    }
</style>
