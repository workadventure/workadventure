<script lang="ts">
    import { onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { on } from "svelte/events";
    import {
        chatDetachedStore,
        chatVisibilityStore,
        INITIAL_SIDEBAR_WIDTH,
        INITIAL_SIDEBAR_WIDTH_MOBILE,
    } from "../Stores/ChatStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
    import { blocker } from "../Utils/screenBlocker";
    import LL from "../../i18n/i18n-svelte";
    import { selectedRoomStore } from "./Stores/SelectRoomStore";
    import Chat from "./Components/Chat.svelte";
    import { chatSidebarWidthStore, hideActionBarStoreBecauseOfChatBar } from "./ChatSidebarWidthStore";
    import {
        clampChatSidebarWidth,
        CHAT_SIDEBAR_MIN_WIDTH,
        maxChatSidebarWidth,
        snapChatSidebarWidth,
    } from "./ChatSidebarWidth";
    import { IconX } from "@wa-icons";

    let container: HTMLElement | undefined = $state();
    // Detachable chat (desktop): the inner content (attachHome → detachTarget → Chat) is reparented
    // into a Document Picture-in-Picture window so the chat floats over other apps. Only available
    // in the Electron shell, where the video PiP uses a NATIVE window, leaving the single
    // documentPictureInPicture slot free for the chat.
    let attachHome: HTMLElement | undefined = $state();
    let detachTarget: HTMLElement | undefined = $state();
    let chatPipWindow: Window | undefined;
    let stopPipDelegation: (() => void)[] = [];

    const DELEGATED_PIP_EVENTS = [
        "beforeinput",
        "click",
        "change",
        "contextmenu",
        "dblclick",
        "focusin",
        "focusout",
        "input",
        "keydown",
        "keyup",
        "mousedown",
        "mousemove",
        "mouseup",
        "pointerdown",
        "pointermove",
        "pointerup",
        "touchend",
        "touchmove",
        "touchstart",
    ];

    function canDetachChat(): boolean {
        return Boolean(
            (window as Window & { WAD?: { desktop?: boolean } }).WAD?.desktop &&
                "documentPictureInPicture" in window
        );
    }

    function copyStyleSheetsInto(pipWindow: Window) {
        for (const styleSheet of [...document.styleSheets]) {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
                const style = document.createElement("style");
                style.textContent = cssRules;
                pipWindow.document.head.appendChild(style);
            } catch {
                // Cross-origin sheet: re-link it instead of inlining.
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = styleSheet.type;
                link.media = styleSheet.media.mediaText;
                link.href = styleSheet.href || "";
                pipWindow.document.head.appendChild(link);
            }
        }
    }

    function reattachChat() {
        stopPipDelegation.forEach((stop) => stop());
        stopPipDelegation = [];
        // eslint-disable-next-line svelte/no-dom-manipulating
        if (attachHome && detachTarget) attachHome.append(detachTarget);
        if (chatPipWindow) {
            chatPipWindow.removeEventListener("pagehide", reattachChat);
            chatPipWindow.close();
        }
        chatPipWindow = undefined;
        chatDetachedStore.set(false);
    }

    async function detachChat() {
        if (chatPipWindow || !canDetachChat() || !detachTarget) {
            return;
        }
        try {
            const pipWindow = await window.documentPictureInPicture.requestWindow({
                preferInitialWindowPlacement: true,
                width: 380,
                height: 620,
            });
            chatPipWindow = pipWindow;
            copyStyleSheetsInto(pipWindow);
            pipWindow.document.body.style.margin = "0";
            pipWindow.document.body.style.height = "100vh";
            pipWindow.document.body.setAttribute("data-testid", "chatPictureInPicture");
            // Svelte 5 delegates DOM handlers to the mount document; a no-op listener on the PiP
            // document makes the reparented chat's handlers fire there.
            stopPipDelegation = DELEGATED_PIP_EVENTS.map((eventName) => on(pipWindow.document, eventName, () => {}));
            chatDetachedStore.set(true);
            // eslint-disable-next-line svelte/no-dom-manipulating
            pipWindow.document.body.append(detachTarget);
            pipWindow.addEventListener("pagehide", reattachChat);
        } catch (error) {
            console.error("Failed to detach chat into a picture-in-picture window", error);
            chatDetachedStore.set(false);
            chatPipWindow = undefined;
        }
    }

    onDestroy(() => {
        // If the sidebar unmounts while detached (e.g. leaving the world), close the floating
        // window and drop the delegation listeners. Svelte still destroys the reparented <Chat>.
        stopPipDelegation.forEach((stop) => stop());
        stopPipDelegation = [];
        if (chatPipWindow) {
            chatPipWindow.removeEventListener("pagehide", reattachChat);
            chatPipWindow.close();
            chatPipWindow = undefined;
        }
        chatDetachedStore.set(false);
    });

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
            sideBarWidth = maxChatSidebarWidth(document.documentElement.clientWidth);
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
            sideBarWidth = maxChatSidebarWidth(document.documentElement.clientWidth);
            chatSidebarWidthStore.set(sideBarWidth);
        }
    };

    const isChatSidebarLargerThanWindow = () => {
        return sideBarWidth >= document.documentElement.clientWidth;
    };

    const isChatBarInFullScreen = () => {
        return sideBarWidth === maxChatSidebarWidth(document.documentElement.clientWidth);
    };
</script>

<svelte:window {onresize} />
{#if $chatVisibilityStore || $chatDetachedStore}
    <section
        bind:this={container}
        id="chat"
        data-testid="chat"
        transition:fly={{ duration: 200, x: isRTL ? sideBarWidth : -sideBarWidth }}
        style="width: {sideBarWidth}px; max-width: {sideBarWidth}px;"
        {@attach blocker}
        class=" chatWindow !min-w-[320px] max-sm:!min-w-[150px] bg-contrast/50 backdrop-blur-md p-0"
    >
        <div class="absolute end-2 top-3 z-50 flex gap-1">
            {#if canDetachChat()}
                <button
                    class="rounded-sm bg-contrast/80 hover:bg-white/10 aspect-square w-8 h-8 flex items-center justify-center !text-white"
                    data-testid="detachChatButton"
                    title={$chatDetachedStore ? "Bring chat back" : "Open chat in a floating window"}
                    aria-label={$chatDetachedStore ? "Bring chat back" : "Detach chat"}
                    onclick={() => ($chatDetachedStore ? reattachChat() : detachChat())}
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M11 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                        <rect x="12.5" y="3.5" width="8" height="6" rx="1" />
                    </svg>
                </button>
            {/if}
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

        {#if $chatDetachedStore}
            <div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <rect x="12" y="11" width="7" height="5" rx="1" />
                </svg>
                <div class="text-sm">Chat is in a floating window.</div>
                <button
                    class="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold text-white hover:bg-secondary/80"
                    onclick={reattachChat}
                >
                    Bring it back
                </button>
            </div>
        {/if}

        <!-- Stable home for the reparented chat: attachHome stays in the section (Svelte-managed),
             detachTarget is what moves to/from the floating window. -->
        <div bind:this={attachHome} class="h-full" class:hidden={$chatDetachedStore}>
            <div bind:this={detachTarget} class="flex h-full w-full flex-col">
                <Chat {sideBarWidth} />
            </div>
        </div>

        {#if !$chatDetachedStore}
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
                aria-valuemax={maxChatSidebarWidth(document.documentElement.clientWidth)}
                onmousedown={handleMousedown}
                ondblclick={toggleFullScreen}
                ontouchstart={handleTouchStart}
                onkeydown={handleKeydown}
            ></div>
        {/if}
    </section>
{/if}

<style>
    @media only screen and (max-width: 767px) {
        .chatWindow {
            width: 100% !important;
        }
    }
</style>
