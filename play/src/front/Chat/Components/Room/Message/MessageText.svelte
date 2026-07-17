<script lang="ts">
    import type { Readable, Unsubscriber } from "svelte/store";
    import { onDestroy, onMount } from "svelte";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";
    import { renderMarkdown } from "../../../Services/MessageFormatter";
    import { sanitizeHTML } from "./WA-HTML-Sanitizer";

    interface Props {
        content: Readable<ChatMessageContent>;
        hasDepth: false;
        updateMessageBody?: () => void;
    }

    let { content, hasDepth, updateMessageBody = () => {} }: Props = $props();

    let html = $state("");

    let unsubscriber: Unsubscriber | undefined;
    onMount(() => {
        unsubscriber = content.subscribe((value) => {
            // A formattedBody is already the HTML the sender rendered: display it as-is (sanitized below)
            // rather than re-parsing it, which is what makes formatting from other Matrix clients survive.
            // Without one, the message is plain text; parsing it as Markdown is what keeps the messages
            // sent before WorkAdventure emitted a `formatted_body` rendering the way they always have.
            const promiseHtml =
                value.formattedBody !== undefined ? Promise.resolve(value.formattedBody) : renderMarkdown(value.body);
            promiseHtml
                .then((result) => {
                    html = result;
                })
                .catch((error) => {
                    console.error("Failed to parse markdown content", error);
                    html = value.body;
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

    /* eslint-disable svelte/no-at-html-tags */
</script>

<div class="message-bubble m-0 {hasDepth ? 'text-xs leading-4' : 'text-sm'} text-white py-1 px-3" lang="">
    {@html sanitizeHTML(html)}
</div>

<style>
</style>
