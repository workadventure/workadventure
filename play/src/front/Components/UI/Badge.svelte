<script lang="ts">
    import type { Snippet } from "svelte";

    // Wraps the design system's `.notification` badge family. Named Badge because
    // Components/UI/Notification.svelte is an unrelated, store-driven toast.
    interface Props {
        variant?: "primary" | "secondary" | "contrast" | "neutral" | "danger" | "warning" | "success" | "light";
        size?: "lg" | "sm" | "xs" | "xxs" | "xxxs";
        border?: boolean;
        // Only has an effect on the success variant, per the design system.
        white?: boolean;
        class?: string;
        children?: Snippet;
    }

    let {
        variant = undefined,
        size = undefined,
        border = false,
        white = false,
        class: className = "",
        children,
    }: Props = $props();
</script>

<span
    class="notification {className}"
    class:notification-primary={variant === "primary"}
    class:notification-secondary={variant === "secondary"}
    class:notification-contrast={variant === "contrast"}
    class:notification-neutral={variant === "neutral"}
    class:notification-danger={variant === "danger"}
    class:notification-warning={variant === "warning"}
    class:notification-success={variant === "success"}
    class:notification-light={variant === "light"}
    class:notification-border={border}
    class:notification-lg={size === "lg"}
    class:notification-sm={size === "sm"}
    class:notification-xs={size === "xs"}
    class:notification-xxs={size === "xxs"}
    class:notification-xxxs={size === "xxxs"}
>
    {#if children}
        <span class="notification-value" class:white>{@render children()}</span>
    {/if}
</span>
