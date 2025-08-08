<script lang="ts">
    import { blur } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { modalIframeStore, modalVisibilityStore } from "../../Stores/ModalStore";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import XIcon from "../Icons/XIcon.svelte";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";

    let modalIframe: HTMLIFrameElement;
    let mainModal: HTMLDivElement;

    let isFullScreened = false;

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
        // Note: the fullscreen functionality is not implemented yet
        /*if ($modalIframeStore?.position == "center") {
            isFullScreened = true;
        }*/
    });

    onDestroy(() => {
        // Note: we are running unregisterIframe every time and not only when allowApi is true,
        // because of a possible race condition where the $modalIframeStore store is emptied before onDestroy is called,
        // which would lead to an error in unregisterIframe.
        //if ($modalIframeStore?.allowApi) {
        iframeListener.unregisterIframe(modalIframe);
        //}
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

<div
    class="menu-container fixed h-dvh w-dvw z-[2000] pointer-events-auto top-0 transition-all {isMobile
        ? 'mobile'
        : $modalIframeStore?.position} {isFullScreened ? 'fullscreened' : ''}"
    bind:this={mainModal}
>
    <div class="w-full h-full bg-contrast/80 backdrop-blur rounded" transition:blur={{ amount: 10, duration: 250 }}>
        <div
            class={`flex justify-center items-center content-center bg-contrast/80 backdrop-blur p-2 space-x-0 @lg/main-layout:space-x-2 rounded-lg absolute z-50 hover:opacity-100 opacity-25 transition-opacity duration-300
                ${
                    isFullScreened || isMobile
                        ? "top-4 right-4"
                        : `${
                              $modalIframeStore?.position == "center" || $modalIframeStore?.position == "left"
                                  ? "flex-col gap-1 top-0 -right-20"
                                  : "flex-col gap-1 top-0 -left-20"
                          }`
                }
            `}
        >
            {#if modalUrl != undefined}
                {#if $modalIframeStore?.allowFullScreen}
                    <button
                        class="btn btn-light btn-ghost rounded hidden @lg/main-layout:block"
                        on:click={() => (isFullScreened = !isFullScreened)}
                    >
                        {#if isFullScreened}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-arrows-minimize"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M5 9l4 0l0 -4" />
                                <path d="M3 3l6 6" />
                                <path d="M5 15l4 0l0 4" />
                                <path d="M3 21l6 -6" />
                                <path d="M19 9l-4 0l0 -4" />
                                <path d="M15 9l6 -6" />
                                <path d="M19 15l-4 0l0 4" />
                                <path d="M15 15l6 6" />
                            </svg>
                        {:else}
                            <FullScreenIcon />
                        {/if}
                    </button>
                {/if}
            {/if}
            <button
                on:click|preventDefault|stopPropagation={close}
                class="btn btn-danger rounded m-0"
                style={isFullScreened == true ? "" : "margin: 0px;"}
                data-testid="close-modal-button"
            >
                <XIcon />
            </button>
        </div>
        {#if modalUrl != undefined}
            <iframe
                id="modalIframe"
                bind:this={modalIframe}
                height="100%"
                width="100%"
                allow={$modalIframeStore?.allow}
                title={$modalIframeStore?.title}
                src={modalUrl}
                class="border-0 relative z-40"
                allowtransparency
                style="color-scheme: auto"
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
        &.right:not(.fullscreened),
        &.left:not(.fullscreened) {
            width: 33%;
        }
        &.right {
            right: 0;
        }
        &.left {
            left: 0;
        }
        &.center:not(.fullscreened) {
            width: 75%;
            height: 75%;
            left: 0;
            right: 0;
            top: 12.5%;
            margin-right: auto;
            margin-left: auto;
        }
    }
</style>
