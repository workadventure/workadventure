<script lang="ts">
    import type { UrlPreview } from "../../../Links/UrlPreviewFetcher";
    import { openChatLinkAsCoWebsite } from "../../../Links/ChatLinkOpener";

    interface Props {
        preview: UrlPreview;
        /** Called once the image has settled, so the timeline can re-anchor. */
        onResize?: () => void;
    }

    let { preview, onResize = () => {} }: Props = $props();

    // Same behaviour as clicking the bare link in the message body.
    function open(event: MouseEvent) {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
            return;
        }
        event.preventDefault();
        openChatLinkAsCoWebsite(preview.link).catch((error) => console.error("Failed to open link preview", error));
    }
</script>

<a
    class="block no-underline rounded border border-solid border-white/10 bg-contrast/40 overflow-hidden hover:bg-contrast/60 transition-colors"
    href={preview.link}
    target="_blank"
    rel="noopener noreferrer"
    onclick={open}
>
    {#if preview.image}
        <img
            class="w-full object-cover max-h-40 block"
            src={preview.image.src}
            alt={preview.image.alt ?? ""}
            loading="lazy"
            draggable="false"
            onload={onResize}
            onerror={onResize}
        />
    {/if}
    <div class="flex gap-2 items-start p-2">
        {#if preview.siteIcon}
            <img
                class="w-8 h-8 rounded object-cover shrink-0"
                src={preview.siteIcon}
                alt=""
                loading="lazy"
                draggable="false"
                onload={onResize}
                onerror={onResize}
            />
        {/if}
        <div class="min-w-0">
            <div class="text-xs opacity-75 truncate">{preview.siteName}</div>
            <div class="text-sm font-bold text-white line-clamp-2">{preview.title}</div>
            {#if preview.description}
                <div class="text-xs opacity-75 line-clamp-2 mt-0.5">{preview.description}</div>
            {/if}
        </div>
    </div>
</a>
