<script lang="ts">
    const SLOTS = $$props.$$slots;
</script>

<div
    class="bg-contrast/80 flex flex-col backdrop-blur-md text-white min-w-60 min-h-20 rounded-lg overflow-hidden transition-all animation responsive {SLOTS.iconButton
        ? 'px-10'
        : ''}"
>
    <div class="flex items-center p-4 pointer-events-auto justify-center grow">
        <div class="text-center leading-6 responsive-message">
            <slot />
        </div>
    </div>
    {#if SLOTS.buttons}
        <div class="buttons-wrapper flex items-center justify-center p-2 space-x-2 bg-contrast/50 pointer-events-auto">
            <slot name="buttons" />
        </div>
    {/if}
    {#if SLOTS.iconButton}
        <slot name="iconButton" />
    {/if}
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
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

    @media (max-width: 768px) {
        .responsive {
            scale: 0.6;
        }
    }
</style>
