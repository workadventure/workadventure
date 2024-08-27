<script lang="ts">
    import { fly } from "svelte/transition";
    import { enableUserInputsStore } from "../Stores/UserInputStore";
    import { mapEditorModeStore } from "../Stores/MapEditorStore";
    import { chatVisibilityStore, INITIAL_SIDEBAR_WIDTH } from "../Stores/ChatStore";
    import Chat from "./Components/Chat.svelte";

    let container: HTMLElement;

    function closeChat() {
        chatVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && $chatVisibilityStore) {
            closeChat();
        } else if (e.key === "c" && !$chatVisibilityStore && !$mapEditorModeStore && $enableUserInputsStore) {
            chatVisibilityStore.set(true);
        }
    }

    let sideBarWidth: number;

    const handleMousedown = (e: MouseEvent) => {
        let dragX = e.clientX;
        document.onmousemove = (e) => {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const newWidth = Math.min(container.offsetWidth + e.clientX - dragX, vw);
            container.style.maxWidth = newWidth + "px";
            container.style.width = newWidth + "px";
            dragX = e.clientX;
        };
        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };

    const handleTouchStart = (e: TouchEvent) => {
        let dragX = e.targetTouches[0].pageX;

        function onTouchMove(e: TouchEvent) {
            const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const newWidth = Math.min(container.offsetWidth + e.targetTouches[0].pageX - dragX, vw);

            container.style.maxWidth = newWidth + "px";
            container.style.width = newWidth + "px";
            dragX = e.targetTouches[0].pageX;
        }

        document.addEventListener("touchmove", onTouchMove);

        document.addEventListener("touchend", () => {
            document.removeEventListener("touchmove", onTouchMove);
        });
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

    const onresize = () => {
        if (isChatSidebarLargerThanWindow()) {
            container.style.maxWidth = document.documentElement.clientWidth + "px";
            container.style.width = document.documentElement.clientWidth + "px";
        }
    };

    const isChatSidebarLargerThanWindow = () => {
        return sideBarWidth >= document.documentElement.clientWidth;
    };

    const isChatBarInFullScreen = () => {
        return sideBarWidth === document.documentElement.clientWidth;
    };
</script>

<svelte:window on:keydown={onKeyDown} on:resize={onresize} />
{#if $chatVisibilityStore}
    <section
        bind:clientWidth={sideBarWidth}
        bind:this={container}
        id="chat"
        data-testid="chat"
        transition:fly={{ duration: 200, x: -INITIAL_SIDEBAR_WIDTH }}
        class="chatWindow !tw-min-w-full sm:!tw-min-w-[360px] tw-bg-contrast/95 tw-backdrop-blur-md tw-p-4 "
    >
        <button class="close-window" data-testid="closeChatButton" on:click={closeChat}>&#215;</button>
        <Chat {sideBarWidth} />

        <div
            class="!tw-absolute !tw-right-1 !tw-top-0 !tw-bottom-0 !tw-m-auto !tw-w-1.5 !tw-h-32 !tw-bg-white !tw-rounded !tw-cursor-col-resize"
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
        position: absolute !important;
        top: 0;
        min-width: 335px !important;
        width: 335px;
        pointer-events: auto;

        height: 100dvh !important;
        z-index: 2000;
        pointer-events: auto;
        .close-window {
            cursor: pointer;
            align-self: end;
        }
    }
</style>
