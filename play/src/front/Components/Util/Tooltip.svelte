<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    export let text: string;
    export let rightPosition = "false";

    let tooltipElement: HTMLDivElement;
    let textElement: HTMLSpanElement;

    function hide() {
        textElement?.style.setProperty("visibility", "hidden");
    }
    function show() {
        textElement?.style.setProperty("visibility", "visible");
    }

    onMount(() => {
        tooltipElement?.parentElement?.addEventListener("mouseenter", () => show());
        tooltipElement?.parentElement?.addEventListener("mouseleave", () => hide());
    });

    onDestroy(() => {
        tooltipElement?.parentElement?.removeEventListener("mouseenter", () => show());
        tooltipElement?.parentElement?.removeEventListener("mouseleave", () => hide());
    });
</script>

<div bind:this={tooltipElement} class="tooltip tw-w-fit">
    <span bind:this={textElement} class="tooltiptext {rightPosition === 'true' ? 'right-tooltip' : 'top-tooltip'}"
        >{text}</span
    >
</div>

<style lang="scss">
    .tooltip {
        display: block;
        .tooltiptext {
            white-space: pre;
            visibility: hidden;
            position: absolute;
            align-items: center;
            border-radius: 0.25rem;
            --tw-bg-opacity: 1;
            background-color: rgb(56 56 74 / var(--tw-bg-opacity));
            padding-left: 0.75rem;
            padding-right: 0.75rem;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            text-align: center;
            --tw-text-opacity: 1;
            color: rgb(255 255 255 / var(--tw-text-opacity));
        }

        .right-tooltip {
            left: 10px;
            bottom: 50%;
            transform: translate(0, 50%);
            &::after {
                top: calc(50% - 5px);
                left: -5px;
                border-color: theme("colors.transparent") theme("colors.medium-purple") theme("colors.transparent")
                    theme("colors.transparent");
            }
        }
        .top-tooltip {
            bottom: 10px;
            left: 0;
            &::after {
                left: 1.5rem;
            }
        }
    }
</style>
