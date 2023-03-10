<script lang="ts">
    import {SvelteComponent} from "svelte";

    export let text: string;
    export let buttonIcon: SvelteComponent;
    export let onClick: () => void;
</script>
<div id="line" class="tw-flex tw-flex-wrap tw-justify-between tw-items-center">
    <p>{text}</p>
    <button on:click|stopPropagation={onClick}>
        <svelte:component this={buttonIcon} />
    </button>
</div>

<style lang="scss">
  #line {
    p {
      @apply tw-m-0 tw-text-white;
    }

    button {
      @apply tw-inline-flex tw-items-center tw-px-1 tw-py-1 tw-text-sm tw-font-medium tw-text-brand-blue tw-bg-white tw-border tw-border-b-lighter-purple tw-rounded-lg tw-cursor-pointer tw-shadow;
      &:hover {
        @apply tw-text-brand-blue;
      }
    }
  }
</style>