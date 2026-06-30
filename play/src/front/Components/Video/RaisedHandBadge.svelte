<script lang="ts">
    import type { VideoBox } from "../../Space/VideoBox";
    import { raisedHandsOrderStore } from "../../Stores/RaisedHandsStore";

    interface Props {
        videoBox: VideoBox;
    }

    let { videoBox }: Props = $props();

    // 1-based order in which this participant raised their hand (undefined when the hand is not raised).
    let position = $derived($raisedHandsOrderStore.get(videoBox.uniqueId));
</script>

{#if position !== undefined}
    <div
        class="absolute top-1 left-1 z-[260] flex items-center gap-1 rounded-full bg-contrast/70 backdrop-blur px-2 py-1 pointer-events-none"
        data-testid="raised-hand-badge"
    >
        <span class="text-base leading-none" aria-hidden="true">✋</span>
        <span class="text-white text-sm font-bold leading-none tabular-nums">{position}</span>
    </div>
{/if}
