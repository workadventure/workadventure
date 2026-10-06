<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        variant?: "primary" | "secondary" | "contrast" | "neutral" | "danger" | "warning" | "success" | "light";
        appearance?: "filled" | "border" | "ghost";
        size?: "xs" | "sm" | "lg";
        display?: "inline" | "inline-flex";
        class?: string;
        children?: Snippet;
    }

    let {
        variant = "neutral",
        appearance = "filled",
        size = "sm",
        display = "inline",
        class: className = "",
        children,
    }: Props = $props();

    // Static design-system classes, so interpolation is safe.
    let classes = $derived(
        [
            "chip",
            `chip-${size}`,
            `chip-${variant}`,
            appearance === "border" && "chip-border",
            appearance === "ghost" && "chip-ghost",
            display,
            "items-center rounded-sm",
            className,
        ]
            .filter(Boolean)
            .join(" "),
    );
</script>

<span class={classes}>
    <span class="chip-label inline-flex items-center leading-none">{@render children?.()}</span>
</span>
