<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        title,
        hint,
        fitContent = false,
        onsubmit,
        children,
    }: { title: string; hint: string; fitContent?: boolean; onsubmit: () => void; children: Snippet } = $props();
</script>

<!-- 534x287 on the design frame: the pair shares the row, caps at that width, and the ratio drives the
     height. `min-h-0` matters: with an aspect ratio, any min-height also imposes a min-width, which
     pushed the pair wider than the window. Below 1100px the cards stack and follow their content.
     The frosted fill is the design's glass card. -->
<form
    novalidate
    onsubmit={(event) => {
        event.preventDefault();
        onsubmit();
    }}
    class={[
        "flex min-h-0 max-w-[534px] flex-[1_1_0] flex-col rounded-[14px] border border-card-border bg-card backdrop-blur-[8px]",
        "px-[clamp(20px,2vw,28px)] pt-[clamp(18px,1.9vw,26px)] pb-[clamp(16px,1.7vw,24px)] shadow-[0_20px_50px_rgba(0,0,0,0.28)]",
        "max-[1100px]:max-w-none max-[1100px]:flex-none max-[1100px]:aspect-auto",
        fitContent ? "aspect-auto" : "aspect-[534/287]",
    ]}
>
    <!-- Bebas Neue 28/39. -->
    <h2 class="mb-2.5 font-display text-[clamp(21px,1.95vw,28px)] leading-[calc(39/28)] uppercase">{title}</h2>
    <!-- Paragraph/SM: at 18px the Create description wrapped inside the card. -->
    <p class="text-[clamp(12px,0.98vw,14px)] leading-[calc(24/14)] text-muted">{hint}</p>
    {@render children()}
</form>
