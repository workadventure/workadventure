<script lang="ts">
    import type { WebRtcStreamable } from "../../../Space/Streamable";
    import InnerWebRtcVideo from "./InnerWebRtcVideo.svelte";

    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onloadvideoelement?: (event: Event) => void;
        onvideo?: () => void;
        onnovideo?: () => void;
        loop?: boolean;
        media: WebRtcStreamable;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onloadvideoelement,
        onvideo,
        onnovideo,
        loop = false,
        media,
    }: Props = $props();

    let streamStore = $derived(media.streamStore);
    let setDimensions = $derived(media.setDimensions);
</script>

{#if $streamStore}
    {#key $streamStore}
        <InnerWebRtcVideo
            {style}
            {className}
            bind:videoWidth
            bind:videoHeight
            {onloadvideoelement}
            {loop}
            stream={$streamStore}
            {setDimensions}
            {onvideo}
            {onnovideo}
        />
    {/key}
{/if}
