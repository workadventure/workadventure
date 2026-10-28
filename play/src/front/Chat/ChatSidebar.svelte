<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatVisibilityStore, INITIAL_SIDEBAR_WIDTH, INITIAL_SIDEBAR_WIDTH_MOBILE } from "../Stores/ChatStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { blocker } from "../Utils/screenBlocker";
    import LL from "../../i18n/i18n-svelte";
    import { selectedRoomStore } from "./Stores/SelectRoomStore";
    import Chat from "./Components/Chat.svelte";
    import { chatSidebarWidthStore, hideActionBarStoreBecauseOfChatBar } from "./ChatSidebarWidthStore";
    import { clampChatSidebarWidth, CHAT_SIDEBAR_MIN_WIDTH, snapChatSidebarWidth } from "./ChatSidebarWidth";
    import { IconX } from "@wa-icons";

    let container: HTMLElement | undefined = $state();

    function closeChat() {
        chatVisibilityStore.set(false);
    }

    let isInSpecificDiscussion = $derived($selectedRoomStore !== undefined);

    let sideBarWidth: number = $state($chatSidebarWidthStore);

    const isRTL: boolean = document.documentElement.dir === "rtl";

    const viewportWidth = () => Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    const handleMousedown = (e: MouseEvent) => {
        let dragX = e.clientX;
        const initialWidth = sideBarWidth;

        document.onmousemove = (e) => {
            const diff = e.clientX - dragX;
            sideBarWidth = clampChatSidebarWidth(isRTL ? initialWidth - diff : initialWidth + diff, viewportWidth());
        };
        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
            sideBarWidth = snapChatSidebarWidth(sideBarWidth, viewportWidth());
            chatSidebarWidthStore.set(sideBarWidth);
        };
    };
    const handleTouchStart = (e: TouchEvent) => {
        let dragX = e.targetTouches[0].pageX;

        function onTouchMove(e: TouchEvent) {
            const diff = e.targetTouches[0].pageX - dragX;
            sideBarWidth = clampChatSidebarWidth(isRTL ? sideBarWidth - diff : sideBarWidth + diff, viewportWidth());

            dragX = e.targetTouches[0].pageX;
        }

        function onTouchEnd() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            sideBarWidth = snapChatSidebarWidth(sideBarWidth, viewportWidth());
            chatSidebarWidthStore.set(sideBarWidth);
        }

        document.addEventListener("touchmove", onTouchMove);
        document.addEventListener("touchend", onTouchEnd);
    };

    const toggleFullScreen = () => {
        if (isChatBarInFullScreen()) {
            const initialWidth = isMediaBreakpointUp("md") ? INITIAL_SIDEBAR_WIDTH_MOBILE : INITIAL_SIDEBAR_WIDTH;
            sideBarWidth = clampChatSidebarWidth(initialWidth, viewportWidth());
        } else {
            const fullWidth = document.documentElement.clientWidth;
            sideBarWidth = fullWidth;
        }
        chatSidebarWidthStore.set(sideBarWidth);
    };

    const KEYBOARD_RESIZE_STEP = 20;

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            toggleFullScreen();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            // The arrow follows the handle on screen: it moves left in RTL, where the panel sits on the right.
            const grows = (e.key === "ArrowRight") !== isRTL;
            const step = grows ? KEYBOARD_RESIZE_STEP : -KEYBOARD_RESIZE_STEP;
            sideBarWidth = clampChatSidebarWidth(sideBarWidth + step, viewportWidth());
        } else {
            return;
        }
        e.preventDefault();
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
        class=" chatWindow !min-w-[320px] max-sm:!min-w-[150px] bg-contrast/50 backdrop-blur-md p-0"
    >
        {#if $hideActionBarStoreBecauseOfChatBar && isInSpecificDiscussion}
            <div class="close-window absolute end-2 top-3 rounded-sm p-1 bg-contrast/80 z-50">
                <button
                    class="hover:bg-white/10 rounded aspect-square w-8 h-8 m-0 flex items-center justify-center !text-white"
                    data-testid="closeChatButton"
                    onclick={closeChat}
                >
                    <IconX font-size="20" />
                </button>
            </div>
        {/if}

        <Chat {sideBarWidth} />
        <!-- A focusable separator is the WAI-ARIA window splitter pattern, which Svelte's a11y rules don't know. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
        <div
            class="!absolute !end-1 !top-0 !bottom-0 !z-20 !m-auto !w-1 !h-32 !bg-white !rounded !cursor-col-resize select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            id="resize-bar"
            role="separator"
            tabindex="0"
            aria-orientation="vertical"
            aria-label={$LL.chat.resizeChat()}
            aria-valuenow={Math.round(sideBarWidth)}
            aria-valuemin={CHAT_SIDEBAR_MIN_WIDTH}
            aria-valuemax={document.documentElement.clientWidth}
            onmousedown={handleMousedown}
            ondblclick={toggleFullScreen}
            ontouchstart={handleTouchStart}
            onkeydown={handleKeydown}
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
