<script lang="ts">
    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;
    export let loop = false;

    let videoElement: HTMLVideoElement|undefined;
</script>

<video
    style={style}
    bind:videoWidth={videoWidth}
    bind:videoHeight={videoHeight}
    bind:this={videoElement}
    on:loadedmetadata={onLoadVideoElement}
    class={className}
    autoplay
    playsinline
    muted={true}
    {loop}
/>
