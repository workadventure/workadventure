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
            iframeListener.registerChatIframe(modalIframe);
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
            width: 100vw !important;
            height: 100vh !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
        }
    }
</style>
