<script lang="ts">
    import type { MatrixClient } from "matrix-js-sdk";
    import { tick } from "svelte";
    import LL from "../../../../../i18n/i18n-svelte";
    import { UrlPreviewFetcher, type UrlPreview } from "../../../Links/UrlPreviewFetcher";
    import LinkPreviewCard from "./LinkPreviewCard.svelte";

    const MAX_PREVIEWS_WHEN_LIMITED = 2;

    interface Props {
        eventId: string;
        links: string[];
        client: MatrixClient;
        eventTimestamp: number;
        /** Lets the timeline re-anchor once cards change the height of the message. */
        onResize?: () => void;
    }

    let { eventId, links, client, eventTimestamp, onResize = () => {} }: Props = $props();

    let storageKey = $derived(`hide_preview_${eventId}`);
    // Writable: reads back what the user chose for this message last time, and hide() overrides it.
    let hidden = $derived(localStorage.getItem(storageKey) === "1");
    let limited = $state(true);
    let previews: UrlPreview[] = $state([]);

    let fetcher = $derived(new UrlPreviewFetcher(client, eventTimestamp));

    $effect(() => {
        // Read every dependency before the first await. Anything read after one is not
        // tracked, and this effect would then never run again.
        const currentLinks = links;
        const currentFetcher = fetcher;
        const isHidden = hidden;
        const isLimited = limited;

        if (isHidden || currentLinks.length === 0) {
            previews = [];
            return;
        }

        const controller = new AbortController();
        const wanted = isLimited ? currentLinks.slice(0, MAX_PREVIEWS_WHEN_LIMITED) : currentLinks;

        (async () => {
            const results = await Promise.all(wanted.map((link) => currentFetcher.fetchPreview(link, true)));
            if (controller.signal.aborted) {
                return;
            }
            previews = results.filter((preview): preview is UrlPreview => preview !== null);
            // The message just got taller; let the timeline catch up before it measures.
            await tick();
            onResize();
        })().catch((error) => console.error("Failed to load link previews", error));

        return () => controller.abort();
    });

    function hide() {
        localStorage.setItem(storageKey, "1");
        hidden = true;
    }

    let remaining = $derived(links.length - previews.length);
</script>

{#if !hidden && previews.length > 0}
    <div class="flex flex-col gap-1 px-3 pb-2 pt-1" aria-label={$LL.chat.urlPreview.label()}>
        {#each previews as preview (preview.link)}
            <LinkPreviewCard {preview} {onResize} />
        {/each}

        <div class="flex gap-2 items-center">
            {#if links.length > MAX_PREVIEWS_WHEN_LIMITED}
                <button
                    class="text-xs underline opacity-75 hover:opacity-100 bg-transparent border-none p-0 cursor-pointer text-white"
                    onclick={() => (limited = !limited)}
                >
                    {limited ? $LL.chat.showMore({ number: remaining }) : $LL.chat.showLess()}
                </button>
            {/if}
            <button
                class="text-xs underline opacity-75 hover:opacity-100 bg-transparent border-none p-0 cursor-pointer text-white ml-auto"
                onclick={hide}
            >
                {$LL.chat.urlPreview.hide()}
            </button>
        </div>
    </div>
{/if}
