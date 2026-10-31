<script lang="ts">
    import type { Snippet } from "svelte";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import { announce } from "../../Stores/LiveAnnouncerStore";

    interface Props {
        extraClasses: string;
        duration?: number;
        toastUuid?: string;
        theme: "success" | "error" | "secondary";
        children?: Snippet;
        buttons?: Snippet;
    }

    let {
        extraClasses = "",
        duration = undefined,
        toastUuid = undefined,
        theme = "success",
        children,
        buttons,
    }: Props = $props();

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let message: HTMLDivElement | undefined = $state();
    // A toast that closes by itself pauses while the pointer or the focus is on it (RGAA 13.1).
    let paused = $state(false);
    let remaining = 0;
    let startedAt = 0;

    function startTimer() {
        if (toastUuid === undefined) return;
        const theToastUuid = toastUuid;
        startedAt = Date.now();
        timeout = setTimeout(() => {
            toastStore.removeToast(theToastUuid);
        }, remaining);
    }

    function pause() {
        if (duration === undefined || paused) return;
        paused = true;
        clearTimeout(timeout);
        remaining -= Date.now() - startedAt;
    }

    function resume(event: FocusEvent | MouseEvent) {
        if (duration === undefined || !paused) return;
        const container = event.currentTarget as HTMLElement;
        // Still hovered, or the focus stays inside: the other of the two keeps it paused.
        const focused = event instanceof FocusEvent ? event.relatedTarget : document.activeElement;
        if ((event instanceof FocusEvent && container.matches(":hover")) || container.contains(focused as Node | null))
            return;
        paused = false;
        startTimer();
    }

    onMount(() => {
        if (duration !== undefined && toastUuid === undefined) {
            throw new Error("ToastContainer: if duration is set, toastUuid must be defined");
        }

        // The message only: the buttons are reached with Tab.
        announce(message?.textContent ?? "", theme === "error" ? "assertive" : "polite");

        if (duration !== undefined) {
            remaining = duration;
            startTimer();
        }
    });

    onDestroy(() => {
        clearTimeout(timeout);
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="toast-container flex flex-row flex-nowrap items-stretch gap-1"
    onmouseenter={pause}
    onmouseleave={resume}
    onfocusin={pause}
    onfocusout={resume}
>
    <div
        class="w-2 rounded-lg my-3"
        class:bg-danger={theme === "error"}
        class:bg-success={theme === "success"}
        class:bg-secondary={theme === "secondary"}
    ></div>
    <div
        class="bg-contrast/50 flex flex-col backdrop-blur-md text-white min-w-60 min-h-12 rounded-lg overflow-hidden transition-all responsive z-20 {extraClasses}"
        transition:fly={{ x: 900, duration: 500 }}
    >
        <!-- Progress bar -->
        {#if duration !== undefined}
            <div class="progress-bar-container" class:success={theme === "success"} class:error={theme === "error"}>
                <div
                    class="progress-bar"
                    class:success={theme === "success"}
                    class:error={theme === "error"}
                    class:secondary={theme === "secondary"}
                    style="animation-duration: {duration}ms; animation-play-state: {paused ? 'paused' : 'running'};"
                ></div>
            </div>
        {/if}

        <div class="flex items-center p-4 pointer-events-auto justify-center grow">
            <div class="text-center leading-6 responsive-message" bind:this={message}>
                {@render children?.()}
            </div>
        </div>
        {#if buttons}
            <div
                class="buttons-wrapper flex items-center justify-center p-2 space-x-2 bg-contrast/60 pointer-events-auto"
            >
                {@render buttons()}
            </div>
        {/if}
    </div>
</div>

<style>
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

    .progress-bar.secondary {
        background: linear-gradient(90deg, #4156f6 0%, #3145e3 100%);
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
