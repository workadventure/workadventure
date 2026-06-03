<script lang="ts">
    import { onDestroy } from "svelte";
    import type { LivekitStreamable } from "../../../Space/Streamable";
    import InnerLivekitVideo from "./InnerLivekitVideo.svelte";

    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onloadvideoelement?: (event: Event) => void;
        onvideo?: () => void;
        onnovideo?: () => void;
        media: LivekitStreamable;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onloadvideoelement,
        onvideo,
        onnovideo,
        media,
    }: Props = $props();

    let remoteVideoTrack: LivekitStreamable["remoteVideoTrack"] = $derived(media.remoteVideoTrack);
    let activeMedia: LivekitStreamable | undefined;
    let releaseVideoSubscription: (() => void) | undefined;

    $effect(() => {
        if (activeMedia !== media) {
            releaseVideoSubscription?.();
            activeMedia = media;
            releaseVideoSubscription = media.acquireVideoSubscription();
        }
    });

    onDestroy(() => {
        releaseVideoSubscription?.();
    });
</script>

{#if $remoteVideoTrack}
    {#key $remoteVideoTrack}
        <InnerLivekitVideo
            {style}
            {className}
            bind:videoWidth
            bind:videoHeight
            {onloadvideoelement}
            remoteVideoTrack={$remoteVideoTrack}
            {onvideo}
            {onnovideo}
        />
    {/key}
{/if}
