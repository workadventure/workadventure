<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { toastStore } from "../../Stores/ToastStore";

    const SLOTS = $$props.$$slots;
    export let extraClasses = "";
    export let duration: number | undefined = undefined;
    export let toastUuid: string | undefined = undefined;
    export let theme: "success" | "error" = "success";

    let timeout: ReturnType<typeof setTimeout>;

    onMount(() => {
        if (duration !== undefined && toastUuid === undefined) {
            throw new Error("ToastContainer: if duration is set, toastUuid must be defined");
        }

        if (duration !== undefined && toastUuid !== undefined) {
            const theToastUuid = toastUuid;
            timeout = setTimeout(() => {
                toastStore.removeToast(theToastUuid);
            }, duration);
        }
    });

    onDestroy(() => {
        clearTimeout(timeout);
    });
</script>

<div
    class="toast-container {theme === 'success' ? 'bg-contrast/80' : 'bg-contrast/80'} {theme === 'error'
        ? 'border-danger border-4 border-solid '
        : ''} flex flex-col backdrop-blur-md text-white min-w-60 min-h-12 rounded-lg overflow-hidden transition-all responsive z-20 {extraClasses}"
    transition:fly={{ x: 900, duration: 500 }}
>
    <!-- Progress bar -->
    {#if duration !== undefined}
        <div class="progress-bar-container" class:success={theme === "success"} class:error={theme === "error"}>
            <div
                class="progress-bar"
                class:success={theme === "success"}
                class:error={theme === "error"}
                style="animation-duration: {duration}ms;"
            />
        </div>
    {/if}

    <div class="flex items-center p-4 pointer-events-auto justify-center grow">
        <div class="text-center leading-6 responsive-message">
            <slot />
        </div>
    </div>
    {#if SLOTS.buttons}
        <div
            class="buttons-wrapper flex items-center justify-center p-2 space-x-2 {theme === 'success'
                ? 'bg-contrast'
                : 'bg-contrast'} pointer-events-auto"
        >
            <slot name="buttons" />
        </div>
    {/if}
</div>

<style lang="scss">
    .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        overflow: hidden;
    }

    .progress-bar-container.success {
        background: rgba(34, 197, 94, 0.1);
    }

    .progress-bar-container.error {
        background: rgba(239, 68, 68, 0.1);
    }

    .progress-bar {
        height: 100%;
        transform-origin: left center;
        animation-name: progress-fill;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        will-change: transform;
    }

    .progress-bar.success {
        background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
    }

    .progress-bar.error {
        background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        transition: width 0.05s linear;
    }

    @keyframes progress-fill {
        from {
            transform: scaleX(0);
        }
        to {
            transform: scaleX(1);
        }
    }
</style>
