<script lang="ts">
    /* eslint-disable svelte/no-at-html-tags */
    import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";
    import type { SendUserMessage } from "@workadventure/messages";
    import { LL } from "../../../i18n/i18n-svelte";
    import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
    import { goToJoinUrl, moveTargetOf } from "../../Utils/JoinUrl";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { IconDoorIn, IconAlertTriangle, IconSpeakerPhone, IconWorld } from "@wa-icons";

    interface Props {
        /** The Quill delta, as JSON. */
        text: string;
        senderName: string;
        senderTextures: SendUserMessage["senderTextures"];
        broadcastToWorld: boolean;
        joinUrl: string;
        receivedAt: Date;
        /** The composer's preview: nothing can be clicked. */
        preview?: boolean;
        /** A ready-made Woka picture (the preview's own Woka) instead of one drawn from senderTextures. */
        wokaSrc?: string;
        onclose?: () => void;
        /** Called once the member has set off for the place. */
        onjoin?: () => void;
    }

    let {
        text,
        senderName,
        senderTextures,
        broadcastToWorld,
        joinUrl,
        receivedAt,
        preview = false,
        wokaSrc,
        onclose,
        onjoin,
    }: Props = $props();

    let html = $derived.by(() => {
        try {
            const delta = JSON.parse(text) as { ops: ConstructorParameters<typeof QuillDeltaToHtmlConverter>[0] };
            return new QuillDeltaToHtmlConverter(delta.ops, { inlineStyles: true }).convert();
        } catch {
            return "";
        }
    });
    let place = $derived(joinUrl ? moveTargetOf(joinUrl) : undefined);
    let time = $derived(receivedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    let placeNotFound = $state(false);

    let wokaPromise = $derived(
        wokaSrc !== undefined
            ? Promise.resolve(wokaSrc)
            : senderTextures.length > 0
              ? CharacterLayerManager.wokaBase64(senderTextures)
              : Promise.resolve(""),
    );

    function join() {
        if (preview) return;
        if (goToJoinUrl(joinUrl)) {
            onjoin?.();
        } else {
            placeNotFound = true;
        }
    }
</script>

<div
    class="announcement-card bg-contrast/90 backdrop-blur-md rounded-lg shadow-xl text-white overflow-hidden border-t-4 {broadcastToWorld
        ? 'border-secondary'
        : 'border-success'}"
    data-testid="announcement-card"
>
    <div class="flex items-start gap-2 px-3 py-2">
        <div class="h-7 w-7 shrink-0 rounded-md bg-white/10 flex items-center justify-center overflow-hidden">
            {#await wokaPromise then woka}
                {#if woka}
                    <img src={woka} alt="" class="h-7 w-7 [image-rendering:pixelated]" draggable="false" />
                {:else}
                    <IconSpeakerPhone font-size="20" />
                {/if}
            {/await}
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
                <span class="font-bold truncate">{senderName || $LL.megaphone.announcement.admin()}</span>
                <span class="text-xs text-white/60">{time}</span>
                {#if senderName}
                    <span
                        class="ms-auto text-xs rounded-full px-2 py-0.5 flex items-center gap-1 {broadcastToWorld
                            ? 'bg-secondary/40'
                            : 'bg-success/40'}"
                    >
                        <IconWorld font-size="12" />
                        {broadcastToWorld
                            ? $LL.megaphone.announcement.wholeWorld()
                            : $LL.megaphone.announcement.thisRoom()}
                    </span>
                {/if}
            </div>
            <div class="announcement-text mt-1 max-h-48 overflow-auto break-words">{@html html}</div>
            {#if joinUrl}
                <button
                    type="button"
                    class="btn btn-secondary btn-sm mt-2 flex items-center gap-1"
                    disabled={preview}
                    onclick={join}
                    data-testid="announcement-join"
                >
                    <IconDoorIn font-size="16" />
                    {place ? $LL.megaphone.announcement.join({ place }) : $LL.megaphone.announcement.joinMap()}
                </button>
            {/if}
            {#if placeNotFound}
                <p class="mt-2 mb-0 text-sm text-danger-400 flex items-center gap-1">
                    <IconAlertTriangle font-size="16" />
                    {$LL.megaphone.announcement.placeNotFound()}
                </p>
            {/if}
        </div>
        {#if onclose && !preview}
            <ButtonClose onclick={onclose} />
        {/if}
    </div>
</div>

<style>
    .announcement-text :global(p) {
        margin: 0;
    }
</style>
