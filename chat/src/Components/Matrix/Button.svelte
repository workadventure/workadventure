<script lang="ts">
    import { SvelteComponent } from "svelte";
    export let text: string = "";
    export let icon: SvelteComponent;
    export let selected: boolean = false;
    export let iconSide = "right";
    export let onClick: () => void;
</script>

<button on:click|stopPropagation={onClick} class={selected ? "selected" : ""}>
    {#if iconSide === "left"}<svelte:component this={icon} class={text !== "" ? "tw-mr-1" : ""} />{/if}
    {text}
    {#if iconSide === "right"}<svelte:component this={icon} class={text !== "" ? "tw-ml-1" : ""} />{/if}
</button>

<style lang="scss">
    button {
        @apply tw-inline-flex tw-items-center tw-px-1 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-rounded-lg tw-cursor-pointer;
        &.selected {
            @apply tw-text-white tw-shadow tw-bg-brand-blue tw-cursor-default;
        }
        &:not(.selected):hover {
            @apply tw-bg-white tw-shadow tw-text-brand-blue;
        }
    }
</style>
