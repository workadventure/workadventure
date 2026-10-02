<script lang="ts">
    import type { Snippet } from "svelte";

    // Wraps the design system's `.avatar` box. Note the app also has a richer, domain-specific
    // Chat/Components/Avatar.svelte; import this one under an alias where both are needed.
    interface Props {
        id?: string;
        size?: "lg" | "sm" | "xs";
        circle?: boolean;
        stack?: boolean;
        borderLight?: boolean;
        href?: string;
        class?: string;
        // Initials, rendered in the design system's .avatar-name span.
        name?: Snippet;
        // A <Badge> overlaid on the corner; the design system positions it per size.
        notification?: Snippet;
        children?: Snippet;
    }

    let {
        id = undefined,
        size = undefined,
        circle = false,
        stack = false,
        borderLight = false,
        href = undefined,
        class: className = "",
        name,
        notification,
        children,
    }: Props = $props();

    // Static design-system classes, so interpolation is safe. `avatar-lg-circle` is the design
    // system's own combo rule: it re-places the notification when lg meets circle.
    let classes = $derived(
        [
            "avatar",
            size && `avatar-${size}`,
            circle && "avatar-circle",
            size === "lg" && circle && "avatar-lg-circle",
            stack && "avatar-stack",
            borderLight && "avatar-border-light",
            className,
        ]
            .filter(Boolean)
            .join(" "),
    );
</script>

{#snippet body()}
    {#if children}
        {@render children()}
    {/if}
    {#if name}
        <span class="avatar-name">{@render name()}</span>
    {/if}
    {#if notification}
        {@render notification()}
    {/if}
{/snippet}

{#if href}
    <a {id} {href} class={classes}>{@render body()}</a>
{:else}
    <div {id} class={classes}>{@render body()}</div>
{/if}
