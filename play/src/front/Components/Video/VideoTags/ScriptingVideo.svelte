<script lang="ts">
    import type { ScriptingVideoStreamable } from "../../../Space/Streamable";

    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onLoadVideoElement?: (event: Event) => void;
        media: ScriptingVideoStreamable;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onLoadVideoElement,
        media,
    }: Props = $props();
    let videoElement: HTMLVideoElement;
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<video
    {style}
    bind:videoWidth
    bind:videoHeight
    bind:this={videoElement}
    onloadedmetadata={onLoadVideoElement}
    class={className}
    autoplay
    playsinline
    src={media.url}
    loop={media.config.loop}
></video>
