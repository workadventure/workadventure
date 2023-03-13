<script lang="ts">
    export let type: string;
    export let text: string;
    export let showTail: boolean = true;
</script>

<div class={`bubble ${type}`}>
    {#if type === "received" && showTail}
        <svg class="left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72.69 118.51">
            <path
                transform="scale (-1, 1)"
                transform-origin="center"
                d="m38.91,0c0,4.98-.31,9.73-.91,14.56,1.92,85.66,34.68,103.95,34.68,103.95h0s-19.1,0-19.1,0c-18.43,0-44.27-16.13-53.59-29.46"
            />
        </svg>
    {/if}
    {text}
    {#if type === "sent" && showTail}
        <svg class="right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72.69 118.51">
            <path
                d="m38.91,0c0,4.98-.31,9.73-.91,14.56,1.92,85.66,34.68,103.95,34.68,103.95h0s-19.1,0-19.1,0c-18.43,0-44.27-16.13-53.59-29.46"
            />
        </svg>
    {/if}
</div>

<style lang="scss">
    .bubble {
        @apply tw-text-white tw-px-2.5 tw-py-1 tw-rounded-2xl tw-relative tw-text-sm tw-cursor-default;
        &.received {
            @apply tw-self-start tw-ml-1 tw-bg-green;
        }
        &.sent {
            @apply tw-self-end tw-mr-1 tw-bg-light-blue;
        }
        svg.left {
            @apply tw-absolute tw-bottom-0 tw-left-[-4.7px] tw-w-[10px] tw-fill-green;
        }
        svg.right {
            @apply tw-absolute tw-bottom-0 tw-right-[-4.7px] tw-w-[10px] tw-fill-light-blue;
        }
    }
</style>
