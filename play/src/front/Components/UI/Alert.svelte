<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        variant?: "danger" | "success" | "warning" | "neutral" | "primary";
        class?: string;
        children?: Snippet;
    }

    let { variant = "danger", class: className = "", children }: Props = $props();

    // Spelled out in full: these are Tailwind-scanned palette utilities, so building them by
    // interpolation would leave them ungenerated. `secondary`/`contrast` are absent on purpose —
    // their palettes stop at -1100, so they have no -1200 background.
    const VARIANT_CLASSES = {
        danger: "bg-danger-1200 border-danger text-danger-400",
        success: "bg-success-1200 border-success text-success-400",
        warning: "bg-warning-1200 border-warning text-warning-400",
        neutral: "bg-neutral-1200 border-neutral text-neutral-400",
        primary: "bg-primary-1200 border-primary text-primary-400",
    } as const;
</script>

<div class="border border-solid rounded p-2 inline-block text-sm {VARIANT_CLASSES[variant]} {className}">
    {@render children?.()}
</div>
