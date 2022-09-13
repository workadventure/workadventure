<script lang="ts">
    import { fly } from "svelte/transition";
    import {
        modalIframeAllowlStore,
        modalIframeSrcStore,
        modalIframeTitlelStore,
        modalVisibilityStore,
    } from "../../Stores/ModalStore";

    function close() {
        modalVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container">
    <div class="tw-w-full tw-bg-dark-purple/95 tw-rounded" transition:fly={{ y: -1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={close}>&times</button>
        {#if $modalIframeSrcStore != undefined}
            <iframe
                id="modalIframe"
                height="100%"
                width="100%"
                allow={$modalIframeAllowlStore}
                title={$modalIframeTitlelStore}
                src={$modalIframeSrcStore}
                class="tw-border-0"
            />
        {/if}
    </div>
</div>
