<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";

    let { secondary = false, children, ...rest }: HTMLButtonAttributes & { secondary?: boolean } = $props();
</script>

<!-- 12px top/bottom padding at 16/24 gives the design's 48px height. The side padding leaves room for
     longer translated labels ("Ouvrir le monde"); `nowrap` keeps them on one line. -->
<button
    type="button"
    {...rest}
    class={[
        "inline-flex min-w-[clamp(78px,6.7vw,96px)] cursor-pointer items-center justify-center gap-2.5 rounded px-6 py-3",
        "text-center text-[clamp(13px,1.12vw,16px)] leading-[1.5] whitespace-nowrap text-white transition-colors duration-140",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-wait disabled:opacity-60",
        secondary
            ? "bg-transparent shadow-[inset_0_0_0_1px_rgb(255_255_255/30%)] hover:not-disabled:bg-white/8"
            : "bg-accent hover:not-disabled:bg-accent-hover",
    ]}
>
    {@render children?.()}
</button>
