<script lang="ts">
    import type { Readable } from "svelte/store";
    import LL from "../../../../../i18n/i18n-svelte";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";
    import ChatImagePreviewModal from "../../ChatImagePreviewModal.svelte";
    import { modals } from "@wa-modals";

    interface Props {
        content: Readable<ChatMessageContent>;
    }

    let { content }: Props = $props();

    let previewUrl = $derived($content.url ?? $content.thumbnailUrl);
    let displayUrl = $derived($content.thumbnailUrl ?? $content.url);
    let canDisplayImage = $derived(displayUrl !== undefined);

    function openImagePreview(url: string, alt: string | undefined) {
        modals.open(ChatImagePreviewModal, { url, alt });
    }
</script>

<div class="cursor-pointer relative group block p-1 pb-0">
    <div
        class="bg-contrast/50 p-1 rounded absolute top-2 right-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all h-fit w-fit z-10"
        role="group"
        aria-label={$LL.chat.imagePreview.imageActions()}
    >
        {#if previewUrl}
            <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="hover:bg-white/10 rounded-sm p-1"
                onclick={(event) => {
                    event.stopPropagation();
                }}
                title={$LL.chat.imagePreview.openInNewTab()}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="block"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                    <path d="M11 13l9 -9" />
                    <path d="M15 4h5v5" />
                </svg>
            </a>
        {/if}
    </div>
    {#if canDisplayImage}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="block"
            role="button"
            tabindex="0"
            onclick={() => openImagePreview(previewUrl ?? "", $content.body)}
            onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openImagePreview(previewUrl ?? "", $content.body);
                }
            }}
        >
            <img class="w-full object-cover max-h-52 rounded" src={displayUrl} alt={$content.body} draggable="false" />
        </div>
    {:else if $content.mediaState === "loading"}
        <div class="text-xs text-white/80 px-2 py-1">{$LL.chat.imagePreview.loading()}</div>
    {:else}
        <div class="text-xs text-white/80 px-2 py-1">
            {$content.mediaErrorKind === "decrypt"
                ? $LL.chat.file.attachmentDecryptError()
                : $LL.chat.imagePreview.loadError()}
        </div>
    {/if}
</div>
