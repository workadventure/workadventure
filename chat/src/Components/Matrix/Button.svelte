<script lang="ts">
    import {SvelteComponent} from "svelte";

    export let text: string = "";
    export let icon: SvelteComponent;
    export let onClick: () => void;
</script>
    <button on:click|stopPropagation={onClick}>
        {text}
        <svelte:component this={icon} />
    </button>

<style lang="scss">
    button {
      @apply tw-inline-flex tw-items-center tw-px-1 tw-py-1 tw-text-sm tw-font-medium tw-text-brand-blue tw-bg-white tw-border tw-border-b-lighter-purple tw-rounded-lg tw-cursor-pointer tw-shadow;
      &:hover {
        @apply tw-text-brand-blue;
      }
    }
</style>