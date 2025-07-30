<script lang="ts">
    import { streamingMegaphoneStore } from "../../../Stores/MediaStore";
    import {
        backOfficeMenuVisibleStore,
        globalMessageVisibleStore,
        mapManagerActivated,
        mapEditorMenuVisibleStore,
        openedMenuStore,
    } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { liveStreamingEnabledStore, requestedMegaphoneStore } from "../../../Stores/MegaphoneStore";
    import AdjustmentsIcon from "../../Icons/AdjustmentsIcon.svelte";
    import MessageGlobalIcon from "../../Icons/MessageGlobalIcon.svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import {
        modalIframeStore,
        modalVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../../Stores/ModalStore";
    import { mapEditorModeStore } from "../../../Stores/MapEditorStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { isTodoListVisibleStore } from "../../../Stores/TodoListStore";
    import { isCalendarVisibleStore } from "../../../Stores/CalendarStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { ADMIN_BO_URL } from "../../../Enum/EnvironmentVariable";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { EditorToolName } from "../../../Phaser/Game/MapEditor/MapEditorModeManager";

    function resetChatVisibility() {
        chatVisibilityStore.set(false);
    }

    function resetModalVisibility() {
        modalVisibilityStore.set(false);
        modalIframeStore.set(null);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function toggleGlobalMessage() {
        if ($requestedMegaphoneStore || $liveStreamingEnabledStore || $streamingMegaphoneStore) {
            analyticsClient.stopMegaphone();
            requestedMegaphoneStore.set(false);
            streamingMegaphoneStore.set(false);
            showModalGlobalComminucationVisibilityStore.set(false);
            return;
        }
        if ($showModalGlobalComminucationVisibilityStore) {
            showModalGlobalComminucationVisibilityStore.set(false);
            return;
        }

        closeMapMenu();
        resetChatVisibility();
        resetModalVisibility();
        mapEditorModeStore.switchMode(false);
        showModalGlobalComminucationVisibilityStore.set(true);
    }

    function toggleMapEditorMode() {
        //if (isMobile) return;
        if ($mapEditorModeStore) gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        analyticsClient.toggleMapEditor(!$mapEditorModeStore);
        mapEditorModeStore.switchMode(!$mapEditorModeStore);
        isTodoListVisibleStore.set(false);
        isCalendarVisibleStore.set(false);
        closeMapMenu();
    }

    function toggleMapExplorerMode() {
        toggleMapEditorMode();
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.ExploreTheRoom);
    }

    function openBo() {
        if (!ADMIN_BO_URL) {
            throw new Error("ADMIN_BO_URL not set");
        }
        const url = new URL(ADMIN_BO_URL, window.location.href);
        url.searchParams.set("playUri", window.location.href);
        window.open(url, "_blank");
        analyticsClient.openBackOffice();
    }

    function closeMapMenu() {
        openedMenuStore.close("mapMenu");
    }
</script>

{#if $mapEditorMenuVisibleStore}
    <ActionBarButton
        on:click={toggleMapEditorMode}
        label={$LL.actionbar.mapEditor()}
        state={$mapEditorModeStore ? "active" : "normal"}
    >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    </ActionBarButton>
{/if}
{#if $mapManagerActivated}
    <ActionBarButton on:click={toggleMapExplorerMode} label={$LL.mapEditor.sideBar.exploreTheRoom()}>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-search"
            ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"
            /><path d="M21 21l-6 -6" /></svg
        >
    </ActionBarButton>
{/if}
{#if $backOfficeMenuVisibleStore}
    <ActionBarButton on:click={openBo} label={$LL.actionbar.bo()}>
        <AdjustmentsIcon />
    </ActionBarButton>
{/if}
{#if $globalMessageVisibleStore}
    <ActionBarButton on:click={toggleGlobalMessage} label={$LL.actionbar.globalMessage()}>
        <MessageGlobalIcon />
    </ActionBarButton>
{/if}
