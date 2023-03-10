<script lang="ts">
    import {SvelteComponent} from "svelte";

    export let onClose: () => void;
    export let component: SvelteComponent;

    let modal: HTMLElement;
</script>

<div id="modal" bind:this={modal} on:click={(e) => { e.target === modal && onClose()}}>
    <svelte:component this={component} />
</div>

<style lang="scss">
    #modal{
      @apply tw-h-[100vh] tw-w-full tw-absolute tw-top-0 tw-left-0 tw-right-0 tw-bottom-0 tw-p-4 tw-pt-16;
      background-color: rgba(0,0,0,0.7);
      animation: fadeIn 200ms;
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
</style>