<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";
    import { hashString, type RowWorld } from "./worlds";

    let {
        world,
        label,
        ...rest
    }: HTMLButtonAttributes & { world: RowWorld; label: string } = $props();

    const hash = $derived(hashString(world.url));
    const hue = $derived(hash % 360);
    let thumbnailFailed = $state(false);
</script>

<!-- 345x198 on the 1440x1024 design frame. The ratio is held exactly (16:9 would be visibly off at this
     size) while the width scales with the window. -->
<button
    type="button"
    title={world.url}
    {...rest}
    class="group relative block aspect-[345/198] w-[clamp(232px,24vw,345px)] flex-none cursor-pointer overflow-hidden rounded-md border border-card-border text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-wait"
>
    <!-- Generated from the URL (a stable hue plus a faint grid that reads as a floor plan), and kept
         under the map's own thumbnail as the fallback if the image fails to load. -->
    <span
        class="absolute inset-0"
        style:background="linear-gradient(150deg, hsl({hue} 42% 42%) 0%, hsl({hue + 28} 38% 26%) 60%, hsl({hue + 44} 34% 18%) 100%)"
    >
        {#if world.thumbnail && !thumbnailFailed}
            <img
                class="absolute inset-0 size-full object-cover"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
                src={world.thumbnail}
                onerror={() => (thumbnailFailed = true)}
            />
        {:else}
            <span
                class="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.09)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.09)_1px,transparent_1px)] bg-size-[40px_40px]"
                style:background-position="{hash % 26}px {(hash >> 5) % 26}px"
            ></span>
        {/if}
    </span>

    <!-- Keeps the name legible over any hue. -->
    <span
        class="absolute inset-0 bg-[linear-gradient(to_top,rgba(4,10,20,0.92)_0%,rgba(4,10,20,0.4)_42%,transparent_72%)]"
    ></span>

    <!-- The hover band REPLACES the caption rather than covering it, so the band can keep a generous
         fade instead of being opaque all the way up to the name. -->
    <span
        class="absolute right-[clamp(10px,1vw,14px)] bottom-[clamp(7px,0.72vw,10px)] left-[clamp(10px,1vw,14px)] flex min-w-0 flex-col gap-0.5 transition-opacity duration-140 group-hover:opacity-0 group-focus-visible:opacity-0"
    >
        <!-- Paragraph/LG, 18/28. -->
        <span class="truncate text-[clamp(14px,1.25vw,18px)] leading-[calc(28/18)]">{world.label}</span>
        {#if world.detail}
            <!-- Paragraph/XS, 13/20. -->
            <span class="truncate text-[clamp(11px,0.9vw,13px)] leading-[calc(20/13)] text-white/62">{world.detail}</span>
        {/if}
    </span>

    <!-- 68/198 of the tile. Bottom-aligned rather than centred: the top third is the fade, so the label
         sits on the solid part, where the name it replaces was. -->
    <span
        class="absolute inset-x-0 bottom-0 z-1 flex h-[34.4%] items-end justify-center bg-linear-to-t from-accent from-64% to-accent/0 pb-[clamp(5px,0.53vw,7.5px)] text-[clamp(14px,1.25vw,18px)] leading-[calc(28/18)] opacity-0 transition-opacity duration-140 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
        <!-- Label and chevron in a row of their own so they centre against each other, not the band. -->
        <span class="flex items-center gap-1.5">
            <span>{label}</span>
            <!-- 6x12 chevron, 2px stroke: the path spans x=1..5 so the stroke lands on the viewBox edges. -->
            <svg
                class="h-3 w-1.5 flex-none"
                viewBox="0 0 6 12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M1 1l4 5l-4 5" />
            </svg>
        </span>
    </span>
</button>
