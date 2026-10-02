<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        // Omit for the design system's bare `.btn` look. Note `contrast` is NOT the same thing:
        // it layers on hover/disabled rules, and combined with ghost the design system's own
        // `.btn-ghost.btn-contrast` ends in `text-danger`, turning the button red.
        variant?: "primary" | "secondary" | "contrast" | "neutral" | "danger" | "warning" | "success" | "light";
        appearance?: "filled" | "border" | "ghost";
        size?: "xs" | "sm" | "lg";
        square?: boolean;
        inlineBlock?: boolean;
        // Renders an <a> instead of a <button>, for links that look like buttons.
        href?: string;
        type?: "button" | "submit" | "reset";
        disabled?: boolean;
        dataTestId?: string;
        class?: string;
        onclick?: (event: MouseEvent) => void;
        // Bind to get the rendered element, e.g. as a floating-UI anchor.
        element?: HTMLElement;
        icon?: Snippet;
        notification?: Snippet;
        children?: Snippet;
        [key: string]: unknown;
    }

    let {
        variant = undefined,
        appearance = "filled",
        size = undefined,
        square = false,
        inlineBlock = false,
        href = undefined,
        type = "button",
        disabled = false,
        dataTestId = undefined,
        class: className = "",
        onclick = undefined,
        element = $bindable(),
        icon,
        notification,
        children,
        ...rest
    }: Props = $props();

    // Spread rather than `data-testid={dataTestId}`: an explicit attribute would win over
    // {...rest} and clobber a caller-supplied data-testid with undefined.
    let testIdAttr = $derived(dataTestId ? { "data-testid": dataTestId } : {});

    // Interpolating is safe here: every entry is a static design-system `@layer components`
    // rule, not a utility that Tailwind's scanner has to find in the source.
    let classes = $derived(
        [
            "btn",
            variant && `btn-${variant}`,
            appearance === "border" && "btn-border",
            appearance === "ghost" && "btn-ghost",
            square && "btn-square",
            inlineBlock && "btn-inline-block",
            size && `btn-${size}`,
            className,
        ]
            .filter(Boolean)
            .join(" "),
    );
</script>

{#snippet body()}
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
{/snippet}

{#if href}
    <a
        bind:this={element}
        {...rest}
        {...testIdAttr}
        {href}
        class={classes}
        aria-disabled={disabled || undefined}
        {onclick}
    >
        {@render body()}
    </a>
{:else}
    <button bind:this={element} {...rest} {...testIdAttr} {type} class={classes} {disabled} {onclick}>
        {@render body()}
    </button>
{/if}
