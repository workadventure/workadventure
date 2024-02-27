<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { modalIframeStore, modalVisibilityStore } from "../../Stores/ModalStore";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { gameManager } from "../../Phaser/Game/GameManager";

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

    let modalUrl = $modalIframeStore
        ? new URL($modalIframeStore.src, gameManager.currentStartedRoom.mapUrl).toString()
        : undefined;

    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="menu-container {isMobile ? 'mobile' : $modalIframeStore?.position}" bind:this={mainModal}>
    <div class="tw-w-full tw-bg-dark-purple/95 tw-rounded" transition:fly={{ x: 1000, duration: 500 }}>
        <button type="button" class="close-window" on:click={close}>&times</button>
        {#if modalUrl != undefined}
            <iframe
                id="modalIframe"
                bind:this={modalIframe}
                height="100%"
                width="100%"
                allow={$modalIframeStore?.allow}
                title={$modalIframeStore?.title}
                src={modalUrl}
                class="tw-border-0"
            />
        {/if}
    </div>
</div>

<style lang="scss">
    .menu-container {
        &.mobile {
            width: 100% !important;
            height: 100% !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
        }
    }
</style>
