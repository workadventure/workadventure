<script lang="ts">
    import { onDestroy } from "svelte";
    import type { Streamable } from "../../Space/Streamable";
    import type { VideoBox } from "../../Space/VideoBox";

    interface Props {
        videoBox: VideoBox;
    }

    let { videoBox }: Props = $props();

    let streamableStore = $derived(videoBox.streamable);
    let streamable = $derived($streamableStore);
    let activeMedia: Streamable["media"] | undefined;
    let releaseVideoSubscription: (() => void) | undefined;

    $effect(() => {
        const media = streamable?.media;
        if (activeMedia === media) {
            return;
        }

        releaseVideoSubscription?.();
        releaseVideoSubscription = undefined;
        activeMedia = media;

        if (media?.type === "livekit") {
            releaseVideoSubscription = media.acquireVideoSubscription();
        }
    });

    onDestroy(() => {
        releaseVideoSubscription?.();
    });
</script>

<div class="fake-livekit-media h-full w-full bg-zinc-900" data-testid="fake-livekit-media"></div>
