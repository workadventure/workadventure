<script lang="ts">
    import type { WhiteboardBoard } from "../../Stores/WhiteboardStore";
    import { whiteboardStore } from "../../Stores/WhiteboardStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import LL from "../../../i18n/i18n-svelte";
    import excalidrawSvg from "../images/applications/icon_excalidraw.svg";
    import { IconArrowsMaximize, IconArrowsMinimize, IconLayoutSidebarRight, IconPresentation, IconX } from "@wa-icons";

    interface Props {
        board: WhiteboardBoard;
    }

    let { board }: Props = $props();

    let mode = $derived(board.mode);
    let participants = $derived(board.participants);
</script>

<header
    class="flex items-center gap-2 p-1 pl-1.5 rounded-lg bg-contrast/90 text-white select-none"
    data-testid="whiteboard-header"
>
    <!-- In the panel, the co-website bar above already names the board. -->
    {#if $mode === "stage"}
        <span class="w-9 h-9 shrink-0 rounded-md bg-secondary/30 flex items-center justify-center">
            <img draggable="false" src={excalidrawSvg} class="w-5 h-5" alt="" />
        </span>
    {/if}
    <div class="flex flex-col min-w-0 flex-1 leading-tight">
        {#if $mode === "stage"}
            <span class="font-bold truncate">{board.title}</span>
            <span class="text-xs text-white/60 truncate">{$LL.mapEditor.properties.whiteboard.label()}</span>
        {/if}
    </div>

    <!-- Clicking someone follows their view, as their avatar inside Excalidraw does. -->
    <div class="flex shrink-0">
        {#each $participants as participant (participant.socketId)}
            <button
                class="w-7 h-7 -ml-1.5 first:ml-0 rounded-full border-2 border-contrast text-xs font-bold text-white flex items-center justify-center hover:z-10 hover:scale-110 transition-transform"
                style:background-color={participant.color}
                title={$LL.mapEditor.properties.whiteboard.follow({ name: participant.name })}
                aria-label={$LL.mapEditor.properties.whiteboard.follow({ name: participant.name })}
                onclick={() => board.follow(participant)}
            >
                {participant.name.charAt(0).toUpperCase()}
            </button>
        {/each}
    </div>

    {#if $mode === "panel"}
        <button
            class="h-9 px-3 shrink-0 rounded-md bg-secondary hover:bg-secondary-600 text-sm font-bold flex items-center gap-1.5"
            onclick={() => whiteboardStore.setMode(board.propertyId, "stage")}
            data-testid="whiteboard-show-large"
        >
            <IconPresentation font-size="16" />
            {$LL.mapEditor.properties.whiteboard.showLarge()}
        </button>
    {:else}
        <button
            class="h-9 px-3 shrink-0 rounded-md border border-white/20 hover:bg-white/10 text-sm flex items-center gap-1.5"
            onclick={() => whiteboardStore.setMode(board.propertyId, "panel")}
            data-testid="whiteboard-show-on-side"
        >
            <IconLayoutSidebarRight font-size="16" />
            {$LL.mapEditor.properties.whiteboard.showOnSide()}
        </button>
        <button
            class="w-9 h-9 shrink-0 rounded-md hover:bg-white/10 flex items-center justify-center"
            aria-label={$highlightFullScreen
                ? $LL.mapEditor.properties.whiteboard.exitFullscreen()
                : $LL.mapEditor.properties.whiteboard.fullscreen()}
            onclick={() => highlightFullScreen.update((fullScreen) => !fullScreen)}
            data-testid="whiteboard-fullscreen"
        >
            {#if $highlightFullScreen}
                <IconArrowsMinimize font-size="18" />
            {:else}
                <IconArrowsMaximize font-size="18" />
            {/if}
        </button>
    {/if}
    <button
        class="w-9 h-9 shrink-0 rounded-md hover:bg-white/10 flex items-center justify-center"
        aria-label={$LL.mapEditor.properties.whiteboard.close()}
        onclick={() => whiteboardStore.close(board.propertyId)}
        data-testid="whiteboard-close"
    >
        <IconX font-size="18" />
    </button>
</header>
