<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import {
        modalIframeAllowStore,
        modalIframeSrcStore,
        modalIframeTitleStore,
        modalVisibilityStore,
        modalPositionStore,
        modalIframeAllowApi,
    } from "../../Stores/ModalStore";

    let modalIframe: HTMLIFrameElement;

    function close() {
        modalVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }

    onMount(() => {
        if ($modalIframeAllowApi) {
            iframeListener.registerChatIframe(modalIframe);
        }
    });

    onDestroy(() => {
        if ($modalIframeAllowApi) {
            iframeListener.unregisterIframe(modalIframe);
        }
    });
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container {$modalPositionStore}">
    <div class="tw-w-full tw-bg-dark-purple/95 tw-rounded" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={close}>&times</button>
        {#if $modalIframeSrcStore != undefined}
            <iframe
                id="modalIframe"
                bind:this={modalIframe}
                height="100%"
                width="100%"
                allow={$modalIframeAllowStore}
                title={$modalIframeTitleStore}
                src={$modalIframeSrcStore}
                class="tw-border-0"
            />
        {/if}
    </div>
</div>
