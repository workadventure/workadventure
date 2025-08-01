<script lang="ts">
    const SLOTS = $$props.$$slots;
    export let extraClasses = "";
    export let fullContent = false;
    export let reduceOnSmallScreen = false;
</script>

<div
    class="popup-container bg-contrast/80 flex flex-col backdrop-blur-md text-white min-w-60 min-h-20 rounded-lg overflow-hidden transition-all animation responsive z-20 {extraClasses}"
    class:responsive={reduceOnSmallScreen}
>
    <div class="flex items-center p-4 pointer-events-auto justify-center grow">
        <div class="text-center leading-6 responsive-message {fullContent ? 'w-full' : ''}">
            <slot />
        </div>
    </div>
    {#if SLOTS.buttons}
        <div class="buttons-wrapper flex items-center justify-center p-2 space-x-2 bg-contrast pointer-events-auto">
            <slot name="buttons" />
        </div>
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
</style>
