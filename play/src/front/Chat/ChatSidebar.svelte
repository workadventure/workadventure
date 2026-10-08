<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatVisibilityStore, INITIAL_SIDEBAR_WIDTH, INITIAL_SIDEBAR_WIDTH_MOBILE } from "../Stores/ChatStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { blocker } from "../Utils/screenBlocker";
    import { selectedRoomStore } from "./Stores/SelectRoomStore";
    import Chat from "./Components/Chat.svelte";
    import { chatSidebarWidthStore, hideActionBarStoreBecauseOfChatBar } from "./ChatSidebarWidthStore";
    import { IconX } from "@wa-icons";

    let container: HTMLElement | undefined = $state();

    function closeChat() {
        chatVisibilityStore.set(false);
    }

    let isInSpecificDiscussion = $derived($selectedRoomStore !== undefined);

    let sideBarWidth: number = $state($chatSidebarWidthStore);

    const isRTL: boolean = document.documentElement.dir === "rtl";

    const handleMousedown = (e: MouseEvent) => {
        let dragX = e.clientX;
        const initialWidth = sideBarWidth;

        document.onmousemove = (e) => {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const diff = e.clientX - dragX;

            const newWidth = isRTL ? initialWidth - diff : initialWidth + diff;
            const minWidth = 200;
            const maxWidth = vw - 50;
            const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

            sideBarWidth = clampedWidth;
        };
        document.onmouseup = () => {
            document.onmousemove = null;
            chatSidebarWidthStore.set(sideBarWidth);
        };
    };
    const handleTouchStart = (e: TouchEvent) => {
        let dragX = e.targetTouches[0].pageX;

        function onTouchMove(e: TouchEvent) {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const diff = e.targetTouches[0].pageX - dragX;
            const newWidth = Math.min(isRTL ? sideBarWidth - diff : sideBarWidth + diff, vw);
            const minWidth = 200;
            const maxWidth = vw - 50;
            const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

            sideBarWidth = clampedWidth;

            dragX = e.targetTouches[0].pageX;
        }

        function onTouchEnd() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            chatSidebarWidthStore.set(sideBarWidth);
        }

        document.addEventListener("touchmove", onTouchMove);
        document.addEventListener("touchend", onTouchEnd);
    };

    const handleDbClick = () => {
        if (isChatBarInFullScreen()) {
            const initialWidth = isMediaBreakpointUp("md") ? INITIAL_SIDEBAR_WIDTH_MOBILE : INITIAL_SIDEBAR_WIDTH;
            sideBarWidth = initialWidth;
        } else {
            const fullWidth = document.documentElement.clientWidth;
            sideBarWidth = fullWidth;
        }
        chatSidebarWidthStore.set(sideBarWidth);
    };

    $effect(() => {
        chatSidebarWidthStore.set(sideBarWidth);
    });

    const onresize = () => {
        if (isChatSidebarLargerThanWindow() && container) {
            sideBarWidth = document.documentElement.clientWidth;
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

<svelte:window {onresize} />
{#if $chatVisibilityStore}
    <section
        bind:this={container}
        id="chat"
        data-testid="chat"
        transition:fly={{ duration: 200, x: isRTL ? sideBarWidth : -sideBarWidth }}
        style="width: {sideBarWidth}px; max-width: {sideBarWidth}px;"
        {@attach blocker}
        class=" chatWindow !min-w-[150px] max-sm:!min-w-[150px] bg-contrast/50 backdrop-blur-md p-0"
    >
        <div class="absolute end-2 top-3 z-50 flex gap-1">
            {#if $hideActionBarStoreBecauseOfChatBar && isInSpecificDiscussion}
                <button
                    class="close-window rounded-sm bg-contrast/80 hover:bg-white/10 aspect-square w-8 h-8 flex items-center justify-center !text-white"
                    data-testid="closeChatButton"
                    onclick={closeChat}
                >
                    <IconX font-size="20" />
                </button>
            {/if}
        </div>

        <div class="flex h-full w-full flex-col">
            <Chat {sideBarWidth} />
        </div>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="!absolute !end-1 !top-0 !bottom-0 !m-auto !w-1 !h-32 !bg-white !rounded !cursor-col-resize select-none"
            id="resize-bar"
            onmousedown={handleMousedown}
            ondblclick={handleDbClick}
            ontouchstart={handleTouchStart}
        ></div>
    </section>
{/if}

<style>
    @media only screen and (max-width: 767px) {
        .chatWindow {
            width: 100% !important;
        }
    }
</style>
