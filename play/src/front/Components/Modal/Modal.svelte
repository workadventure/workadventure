<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { modalIframeStore, modalVisibilityStore } from "../../Stores/ModalStore";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";

    let modalIframe: HTMLIFrameElement;
    let mainModal: HTMLDivElement;

    function close() {
        modalVisibilityStore.set(false);
        if ($modalIframeStore != undefined) {
            iframeListener.sendModalCloseTriggered($modalIframeStore);
        }
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }

    onMount(() => {
        resizeObserver.observe(mainModal);
        if ($modalIframeStore?.allowApi) {
            iframeListener.registerIframe(modalIframe);
        }
    });

    onDestroy(() => {
        if ($modalIframeStore?.allowApi) {
            iframeListener.unregisterIframe(modalIframe);
        }
    });

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container {isMobile ? 'mobile' : $modalIframeStore?.position}" bind:this={mainModal}>
    <div class="tw-w-full tw-bg-dark-purple/95 tw-rounded" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={close}>&times</button>
        {#if $modalIframeStore?.src != undefined}
            <iframe
                id="modalIframe"
                bind:this={modalIframe}
                height="100%"
                width="100%"
                allow={$modalIframeStore?.allow}
                title={$modalIframeStore?.title}
                src={$modalIframeStore?.src}
                class="tw-border-0"
            />
        {/if}
    </div>
</div>

<style lang="scss">
    .menu-container {
        &.mobile {
            width: calc(100% - 8px) !important;
            height: calc(100% - 8px) !important;
            top: 4px !important;
            left: 4px !important;
            right: 4px !important;
            bottom: 4px !important;
        }
    }
</style>
