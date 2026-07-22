<script lang="ts">
    import type { Readable } from "svelte/store";
    import { presenterEffectsStore } from "../../Stores/PresenterEffectStore";

    interface Props {
        /** spaceUserId of the presenter whose effect to render on this shared-screen tile. */
        targetUserId: string;
        /** The shared screen's MediaStream, used by the loupe to magnify the received video. */
        stream?: Readable<MediaStream | undefined>;
    }

    let { targetUserId, stream }: Props = $props();

    let clientWidth = $state(0);
    let clientHeight = $state(0);
    let loupeVideo: HTMLVideoElement | undefined = $state();

    let activeEffect = $derived($presenterEffectsStore.get(targetUserId));
    let streamValue = $derived(stream ? $stream : undefined);

    // Short fading trail for the laser: keep the most recent positions and ramp their opacity.
    const TRAIL_LENGTH = 8;
    let trail = $state<Array<{ x: number; y: number }>>([]);
    let lastKey = "";
    $effect(() => {
        const e = activeEffect;
        if (!e || e.tool !== "laser") {
            if (trail.length) {
                trail = [];
            }
            lastKey = "";
            return;
        }
        const key = `${e.x.toFixed(4)},${e.y.toFixed(4)}`;
        if (key === lastKey) {
            return;
        }
        lastKey = key;
        trail = [...trail, { x: e.x, y: e.y }].slice(-TRAIL_LENGTH);
    });

    // Loupe: feed the shared MediaStream into the lens video.
    $effect(() => {
        const currentStream = streamValue;
        if (loupeVideo && loupeVideo.srcObject !== (currentStream ?? null)) {
            loupeVideo.srcObject = currentStream ?? null;
        }
    });

    // Geometry helpers (all in tile pixels).
    let spotlightRadius = $derived(
        activeEffect
            ? Math.max(40, (activeEffect.scale > 0 ? activeEffect.scale : 0.18) * Math.min(clientWidth, clientHeight))
            : 0
    );
    const LOUPE_RADIUS = 72;
    let loupeZoom = $derived(activeEffect && activeEffect.scale > 0 ? activeEffect.scale : 2.4);
</script>

<div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    bind:clientWidth
    bind:clientHeight
    data-testid="presenter-effects-overlay"
>
    {#if activeEffect && clientWidth > 0 && clientHeight > 0}
        {#if activeEffect.tool === "spotlight"}
            <div
                class="absolute inset-0"
                style={`background: rgba(3, 7, 18, 0.6); -webkit-mask: radial-gradient(circle ${spotlightRadius}px at ${activeEffect.x * clientWidth}px ${activeEffect.y * clientHeight}px, transparent 0, transparent ${spotlightRadius - 2}px, #000 ${spotlightRadius}px); mask: radial-gradient(circle ${spotlightRadius}px at ${activeEffect.x * clientWidth}px ${activeEffect.y * clientHeight}px, transparent 0, transparent ${spotlightRadius - 2}px, #000 ${spotlightRadius}px);`}
            ></div>
        {:else if activeEffect.tool === "loupe"}
            <div
                class="absolute rounded-full border-2 border-white/80 shadow-lg overflow-hidden bg-black"
                style={`left: ${activeEffect.x * clientWidth - LOUPE_RADIUS}px; top: ${activeEffect.y * clientHeight - LOUPE_RADIUS}px; width: ${LOUPE_RADIUS * 2}px; height: ${LOUPE_RADIUS * 2}px;`}
            >
                <!-- svelte-ignore a11y_media_has_caption -->
                <video
                    bind:this={loupeVideo}
                    autoplay
                    muted
                    playsinline
                    class="absolute max-w-none"
                    style={`width: ${clientWidth * loupeZoom}px; height: ${clientHeight * loupeZoom}px; left: ${LOUPE_RADIUS - activeEffect.x * clientWidth * loupeZoom}px; top: ${LOUPE_RADIUS - activeEffect.y * clientHeight * loupeZoom}px; display: ${streamValue ? "block" : "none"};`}
                ></video>
            </div>
        {:else if activeEffect.tool === "laser"}
            {#each trail as point, i (i)}
                <div
                    class="absolute rounded-full bg-red-500"
                    style={`left: ${point.x * clientWidth - 4}px; top: ${point.y * clientHeight - 4}px; width: 8px; height: 8px; opacity: ${((i + 1) / trail.length) * 0.5};`}
                ></div>
            {/each}
            <div
                class="absolute rounded-full"
                style={`left: ${activeEffect.x * clientWidth - 8}px; top: ${activeEffect.y * clientHeight - 8}px; width: 16px; height: 16px; background: #ff3b30; box-shadow: 0 0 12px 5px rgba(255, 59, 48, 0.6);`}
            ></div>
        {/if}
    {/if}
</div>
