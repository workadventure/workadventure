<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy } from "svelte";
    import { enableUserInputsStore } from "../Stores/UserInputStore";
    import { mapEditorModeStore } from "../Stores/MapEditorStore";
    import { chatVisibilityStore, INITIAL_SIDEBAR_WIDTH } from "../Stores/ChatStore";
    import { LocalSpaceProviderSingleton } from "../Space/SpaceProvider/SpaceStore";
    import { CONNECTED_USER_FILTER_NAME, WORLD_SPACE_NAME } from "../Space/Space";
    import Chat from "./Components/Chat.svelte";

    let container: HTMLElement;

    function closeChat() {
        console.debug("closed");

        chatVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && $chatVisibilityStore) {
            closeChat();
        } else if (e.key === "c" && !$chatVisibilityStore && !$mapEditorModeStore && $enableUserInputsStore) {
            chatVisibilityStore.set(true);
        }
    }

    const chatVisibilityStoreUnsubscriber = chatVisibilityStore.subscribe((isVisible: boolean) => {
        const SpaceProvider = LocalSpaceProviderSingleton.getInstance();
        if (!SpaceProvider) return;

        const allWorldUserSpace = SpaceProvider.get(WORLD_SPACE_NAME);
        const connectedUsersFilter = allWorldUserSpace.getSpaceFilter(CONNECTED_USER_FILTER_NAME);

        if (isVisible) {
            connectedUsersFilter.setFilter({
                $case: "spaceFilterEverybody",
                spaceFilterEverybody: {},
            });
        } else {
            connectedUsersFilter.setFilter(undefined);
        }
    });

    onDestroy(() => {
        chatVisibilityStoreUnsubscriber();
    });

    let sideBarWidth;

    const handleMousedown = (e: MouseEvent) => {
        let dragX = e.clientX;
        document.onmousemove = (e) => {
            container.style.width = container.offsetWidth + e.clientX - dragX + "px";
            dragX = e.clientX;
        };
        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };

    const handleTouchStart = (e: TouchEvent) => {
        let dragX = e.targetTouches[0].pageX;

        document.ontouchmove = (e: TouchEvent) => {
            container.style.width = container.offsetWidth + e.targetTouches[0].pageX - dragX + "px";
            dragX = e.targetTouches[0].pageX;
        };
        document.ontouchend = () => {
            document.ontouchmove = null;
        };
    };

    const handleDbClick = () => {
        if (container.style.width === document.documentElement.clientWidth + "px") {
            container.style.width = INITIAL_SIDEBAR_WIDTH + "px";
        } else {
            container.style.width = document.documentElement.clientWidth + "px";
        }
    };

    const handlePageResize = () => {};
</script>

<svelte:window on:keydown={onKeyDown} on:resize={handlePageResize} />
{#if $chatVisibilityStore}
    <section
        bind:clientWidth={sideBarWidth}
        bind:this={container}
        id="chat"
        data-testid="chat"
        transition:fly={{ duration: 200, x: -INITIAL_SIDEBAR_WIDTH }}
        class="chatWindow !tw-min-w-full sm:!tw-min-w-[360px] tw-overflow-hidden tw-bg-contrast/95 tw-backdrop-blur-md tw-p-4"
    >
        <button class="close-window" data-testid="closeChatButton" on:click={closeChat}>&#215;</button>
        <Chat {sideBarWidth} />

        <div
            class="tw-absolute tw-resize-x tw-right-1 tw-top-0 tw-bottom-0 tw-m-auto tw-w-1.5 tw-h-32 tw-bg-white tw-rounded tw-cursor-col-resize"
            id="resize-bar"
            on:mousedown={handleMousedown}
            on:dblclick={handleDbClick}
            on:touchstart={handleTouchStart}
        />
    </section>
{/if}

<style lang="scss">
    @import "../style/breakpoints.scss";

    @include media-breakpoint-up(sm) {
        .chatWindow {
            width: 100% !important;
        }
    }

    .chatWindow {
        color: white;
        display: flex;
        flex-direction: column;
        position: absolute !important;
        top: 0;
        min-width: 335px !important;
        max-width: 100vw !important;

        height: 100vh !important;
        z-index: 2000;
        pointer-events: auto;
        .close-window {
            cursor: pointer;
            align-self: end;
        }
    }
</style>
