<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";

    export let title: string;
    export let open = false;

    const dispatch = createEventDispatcher();

    let arrowRotation = 0;
    let content: HTMLElement;

    function toggleOpen() {
        open = !open;
        arrowRotation = open ? 0 : -90;
        dispatch("toggle", open);
        content.style.height = open ? `${content.scrollHeight}px` : "0px";
        // remove overflow hidden after end of oppening annimation
        if (open) {
            content.addEventListener(
                "transitionend",
                () => {
                    content.style.overflow = "visible";
                },
                { once: true }
            );
        } else {
            content.style.overflow = "hidden";
        }
    }

    onMount(() => {
        arrowRotation = open ? 0 : -90;
        content.style.height = open ? `${content.scrollHeight}px` : "0px";
        content.style.overflow = open ? "visible" : "hidden";
    });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex flex-col">
    <div
        class="flex items-center justify-between p-4 cursor-pointer rounded-lg hover:bg-white/10 {open
            ? 'bg-white/10'
            : ''}"
        on:click={toggleOpen}
    >
        <div class="flex row gap-3 items-center tw-justify-start">
            <div class="tw-w-6 tw-h-6 tw-flex tw-items-center tw-justify-center">
                <slot name="icon" />
            </div>
            <div class="tw-flex-grow tw-font-semibold">
                {title}
            </div>
            <slot name="right" />
        </div>
        <div
            class="tw-flex tw-w-4 tw-h-4 tw-border-t-2 border-r-2 tw-transform-origin-center tw-transition-transform tw-duration-300"
            style="transform: rotate({arrowRotation}deg)"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path
                    fill-rule="evenodd"
                    d="M10 12.586l-4.293-4.293-1.414 1.414 6 6a1 1 0 0 0 1.414 0l6-6-1.414-1.414L10 12.586z"
                    clip-rule="evenodd"
                />
            </svg>
        </div>
    </div>

    <div class="tw-relative tw-transition-all tw-overflow-hidden" bind:this={content}>
        <slot />
    </div>
</div>
