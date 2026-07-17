<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        variant?: "primary" | "secondary" | "contrast" | "neutral" | "danger" | "warning" | "success" | "light";
        appearance?: "filled" | "border" | "ghost";
        size?: "xs" | "sm" | "lg";
        square?: boolean;
        inlineBlock?: boolean;
        type?: "button" | "submit" | "reset";
        disabled?: boolean;
        dataTestId?: string;
        class?: string;
        onclick?: (event: MouseEvent) => void;
        icon?: Snippet;
        notification?: Snippet;
        children?: Snippet;
        [key: string]: unknown;
    }

    let {
        variant = "contrast",
        appearance = "filled",
        size = undefined,
        square = false,
        inlineBlock = false,
        type = "button",
        disabled = false,
        dataTestId = undefined,
        class: className = "",
        onclick = undefined,
        icon,
        notification,
        children,
        ...rest
    }: Props = $props();
</script>

<button
    {...rest}
    {type}
    class="btn btn-{variant} {className}"
    class:btn-border={appearance === "border"}
    class:btn-ghost={appearance === "ghost"}
    class:btn-square={square}
    class:btn-inline-block={inlineBlock}
    class:btn-xs={size === "xs"}
    class:btn-sm={size === "sm"}
    class:btn-lg={size === "lg"}
    data-testid={dataTestId}
    {disabled}
    {onclick}
>
    {#if icon}
        <!-- btn-icon is only self-center: flex keeps an inline svg out of the .btn line box. -->
        <span class="btn-icon flex items-center">{@render icon()}</span>
    {/if}
    {#if children}
        <span class="btn-label">{@render children()}</span>
    {/if}
    {#if notification}
        {@render notification()}
    {/if}
</button>
