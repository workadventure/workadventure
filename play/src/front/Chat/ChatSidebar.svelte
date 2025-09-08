<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatVisibilityStore, INITIAL_SIDEBAR_WIDTH, INITIAL_SIDEBAR_WIDTH_MOBILE } from "../Stores/ChatStore";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { selectedRoomStore } from "./Stores/SelectRoomStore";
    import Chat from "./Components/Chat.svelte";
    import { chatSidebarWidthStore, hideActionBarStoreBecauseOfChatBar } from "./ChatSidebarWidthStore";
    import { IconX } from "@wa-icons";

    let container: HTMLElement;

    const gameScene = gameManager.getCurrentGameScene();

    function reposition() {
        gameScene.reposition();
    }

    function closeChat() {
        chatVisibilityStore.set(false);
    }

    $: isInSpecificDiscussion = $selectedRoomStore !== undefined;

    let sideBarWidth: number = $chatSidebarWidthStore;

    const isRTL: boolean = document.documentElement.dir === "rtl";

    const handleMousedown = (e: MouseEvent) => {
        let dragX = e.clientX;
        document.onmousemove = (e) => {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const diff = e.clientX - dragX;
            const newWidth = Math.min(isRTL ? container.offsetWidth - diff : container.offsetWidth + diff, vw);
            container.style.maxWidth = newWidth + "px";
            container.style.width = newWidth + "px";
            dragX = e.clientX;
        };
        document.onmouseup = () => {
            document.onmousemove = null;
            chatSidebarWidthStore.set(sideBarWidth);
            reposition();
        };
    };
    const handleTouchStart = (e: TouchEvent) => {
        let dragX = e.targetTouches[0].pageX;

        function onTouchMove(e: TouchEvent) {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const diff = e.targetTouches[0].pageX - dragX;
            const newWidth = Math.min(isRTL ? container.offsetWidth - diff : container.offsetWidth + diff, vw);

            container.style.maxWidth = newWidth + "px";
            container.style.width = newWidth + "px";
            dragX = e.targetTouches[0].pageX;
        }

        function onTouchEnd() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            chatSidebarWidthStore.set(sideBarWidth);
            reposition();
        }

        document.addEventListener("touchmove", onTouchMove);
        document.addEventListener("touchend", onTouchEnd);
    };

    const handleDbClick = () => {
        if (isChatBarInFullScreen()) {
            container.style.maxWidth = INITIAL_SIDEBAR_WIDTH + "px";
            container.style.width = INITIAL_SIDEBAR_WIDTH + "px";
        } else {
            container.style.maxWidth = document.documentElement.clientWidth + "px";
            container.style.width = document.documentElement.clientWidth + "px";
        }
    };

    $: chatSidebarWidthStore.set(sideBarWidth);

    const onresize = () => {
        if (isChatSidebarLargerThanWindow() && container) {
            container.style.maxWidth = document.documentElement.clientWidth + "px";
            container.style.width = document.documentElement.clientWidth + "px";
            chatSidebarWidthStore.set(sideBarWidth);
        }
    };

    const isChatSidebarLargerThanWindow = () => {
        return sideBarWidth >= document.documentElement.clientWidth;
    };

    const isChatBarInFullScreen = () => {
        return sideBarWidth === document.documentElement.clientWidth;
    };
</script>

<svelte:window on:resize={onresize} />
{#if $chatVisibilityStore}
    <section
        bind:clientWidth={sideBarWidth}
        bind:this={container}
        id="chat"
        data-testid="chat"
        transition:fly={{ duration: 200, x: isRTL ? sideBarWidth : -sideBarWidth }}
        on:introend={reposition}
        on:outroend={reposition}
        style="width: {sideBarWidth}px; max-width: {Math.min(
            sideBarWidth,
            document.documentElement.clientWidth,
            isMediaBreakpointUp('md') ? INITIAL_SIDEBAR_WIDTH_MOBILE : INITIAL_SIDEBAR_WIDTH
        )}px;"
        class=" chatWindow !min-w-[360px] max-sm:!min-w-[250px] bg-contrast/80 backdrop-blur-md p-0 screen-blocker"
    >
        {#if $hideActionBarStoreBecauseOfChatBar && isInSpecificDiscussion}
            <div class="close-window absolute end-2 top-3 rounded-sm p-1 bg-contrast/80 z-50">
                <button
                    class="hover:bg-white/10 rounded aspect-square w-8 h-8 m-0 flex items-center justify-center !text-white"
                    data-testid="closeChatButton"
                    on:click={closeChat}
                >
                    <IconX font-size="20" />
                </button>
            </div>
        {/if}

        <Chat {sideBarWidth} />
        <div
            class="!absolute !end-1 !top-0 !bottom-0 !m-auto !w-1 !h-32 !bg-white !rounded !cursor-col-resize user-select-none"
            id="resize-bar"
            on:mousedown={handleMousedown}
            on:dblclick={handleDbClick}
            on:touchstart={handleTouchStart}
        />
    </section>
{/if}

<style lang="scss">
    @use "../style/breakpoints.scss" as *;

    @include media-breakpoint-up(sm) {
        .chatWindow {
            width: 100% !important;
        }
    }
</style>
