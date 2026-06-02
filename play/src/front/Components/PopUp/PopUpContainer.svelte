<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        extraClasses?: string;
        fullContent?: boolean;
        reduceOnSmallScreen?: boolean;
        showButtons?: boolean;
        children?: Snippet;
        buttons?: Snippet;
        onclick?: () => void;
    }

    let {
        extraClasses = "",
        fullContent = false,
        reduceOnSmallScreen = false,
        showButtons = true,
        children,
        buttons,
        onclick,
    }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="popup-container bg-contrast/80 flex flex-col backdrop-blur-md text-white min-w-60 min-h-20 rounded-lg overflow-hidden transition-all animation responsive z-20 {extraClasses}"
    class:responsive={reduceOnSmallScreen}
    {onclick}
>
    <div class="flex items-center p-4 px-10 pointer-events-auto justify-center grow">
        <div class="text-center leading-6 responsive-message {fullContent ? 'w-full' : ''}">
            {@render children?.()}
        </div>
    </div>
    {#if showButtons && buttons}
        <div class="buttons-wrapper flex items-center justify-center p-2 space-x-2 bg-contrast pointer-events-auto">
            {@render buttons()}
        </div>
    {/if}
</div>

<style lang="scss">
    .animation {
        animation-duration: 0.5s;
        animation-name: slidein;
    }

    @keyframes slidein {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }
</style>
