<script lang="ts">
    import {
        globalMessageVisibleStore,
        mapManagerActivated,
        mapEditorMenuVisibleStore,
        openedMenuStore,
    } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
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
    import ActionBarButton from "../ActionBarButton.svelte";
    import { EditorToolName } from "../../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { IconSearch, IconTools , IconSpeakerPhone } from "../../Icons";
    import AdditionalMenuItems from "./AdditionalMenuItems.svelte";

    function resetChatVisibility() {
        chatVisibilityStore.set(false);
    }

    function resetModalVisibility() {
        modalVisibilityStore.set(false);
        modalIframeStore.set(null);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function toggleGlobalMessage() {
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

    function closeMapMenu() {
        openedMenuStore.close("mapMenu");
    }
    //TODO : remplacer l'icon par un icon tabler
</script>

{#if $mapEditorMenuVisibleStore}
    <ActionBarButton
        on:click={toggleMapEditorMode}
        label={$LL.actionbar.mapEditor()}
        state={$mapEditorModeStore ? "active" : "normal"}
    >
        <IconTools
        font-size="20"
         />
       
    </ActionBarButton>
{/if}
{#if $mapManagerActivated}
    <ActionBarButton on:click={toggleMapExplorerMode} label={$LL.mapEditor.sideBar.exploreTheRoom()}>
        <IconSearch
        font-size="20"
         />
    </ActionBarButton>
{/if}
{#if $globalMessageVisibleStore}
    <ActionBarButton on:click={toggleGlobalMessage} label={$LL.actionbar.globalMessage()}>
        <IconSpeakerPhone
        font-size="20"
         />
    </ActionBarButton>
{/if}

<AdditionalMenuItems menu="buildMenu" />
