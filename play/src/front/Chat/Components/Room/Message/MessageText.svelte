<script lang="ts">
    import { Readable, Unsubscriber } from "svelte/store";
    import { Marked } from "marked";
    import { onDestroy, onMount } from "svelte";
    import {
        getApplicationEmbedLink,
        isApplicationLink,
    } from "@workadventure/shared-utils/src/Application/ApplicationService";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";
    import { coWebsiteManager } from "../../../../WebRtc/CoWebsiteManager";
    import { SimpleCoWebsite } from "../../../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { sanitizeHTML } from "./WA-HTML-Sanitizer";

    export let content: Readable<ChatMessageContent>;

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
                    highlight(code, lang, info) {
                        const language = hljsModule.default.getLanguage(lang) ? lang : "plaintext";
                        return hljsModule.default.highlight(code, { language }).value;
                    },
                })
            );
        } else {
            marked = new Marked();
        }

        // Custom renderer for links
        const renderer = new marked.Renderer();
        renderer.link = (href: string, title: string, text: string) => {
            // Check if the link is an application link or embeddable link
            const url = new URL(href);
            const link = document.createElement("a");
            link.href = href;
            link.rel = "noopener noreferrer";
            link.innerHTML = text;
            link.title = title;
            link.target = "_blank";
            if (isApplicationLink(url)) {
                link.setAttribute("data-application-link", "true");
                link.setAttribute("data-application-link-url", getApplicationEmbedLink(url));
            }
            return link.outerHTML;
        };

        // Apply the custom renderer and enable line breaks
        marked.use({
            renderer,
            breaks: true,
        });

        return marked;
    }

    let html = "";

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
                });
        });
    });

    onDestroy(() => {
        if (unsubscriber) {
            unsubscriber();
        }
    });

    function onLickLink(event: MouseEvent) {
        if (
            event.target instanceof HTMLAnchorElement &&
            event.target.getAttribute("data-application-link") === "true" &&
            event.target.getAttribute("data-application-link-url") !== null
        ) {
            event.preventDefault();
            event.stopPropagation();
            const link: string = event.target.getAttribute("data-application-link-url")!;
            const coWebsite = new SimpleCoWebsite(
                new URL(link),
                false,
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; allowfullscreen",
                50,
                true
            );
            coWebsiteManager
                .loadCoWebsite(coWebsite)
                .catch((error) => console.error("Failed to load co-website", error));
        }
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<p class="tw-p-0 tw-m-0 tw-text-xs" on:click={onLickLink}>
    {@html sanitizeHTML(html)}
</p>
