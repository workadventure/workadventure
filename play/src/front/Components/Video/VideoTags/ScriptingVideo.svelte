<svelte:options immutable={true} />

<script lang="ts">
    import type { ScriptingVideoStreamable } from "../../../Stores/StreamableCollectionStore";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;

    export let media: ScriptingVideoStreamable;
    let videoElement: HTMLVideoElement;
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video
    {style}
    bind:videoWidth
    bind:videoHeight
    bind:this={videoElement}
    on:loadedmetadata={onLoadVideoElement}
    class={className}
    autoplay
    playsinline
    src={media.url}
    loop={media.config.loop}
/>
