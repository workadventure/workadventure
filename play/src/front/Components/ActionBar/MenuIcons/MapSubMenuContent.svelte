<script lang="ts">
    import type { AreaData } from "@workadventure/map-editor";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import { isInsidePersonalAreaStore, personalAreaDataStore } from "../../../Stores/PersonalDeskStore";
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
    import AdditionalMenuItems from "./AdditionalMenuItems.svelte";
    import { IconMapSearch, IconDesk,IconSpeakerPhone, IconMapEditor } from "@wa-icons";

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

    async function goToPersonalDesk() {
        // Close the menu
        openedMenuStore.close("profileMenu");

        // Walk to the personal desk using the GameScene method
        try {
            await gameManager.getCurrentGameScene()?.walkToPersonalDesk();
        } catch (error) {
            console.error("Error while walking to personal desk", error);
            warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorMoving(), { closable: true });
        }
    }

    async function unclaimPersonalDesk() {
        if (!$personalAreaDataStore) {
            warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorNotFound(), { closable: true });
            return;
        }

        try {
            const gameScene = gameManager.getCurrentGameScene();
            const mapEditorModeManager = gameScene.getMapEditorModeManager();
            if (!mapEditorModeManager) {
                warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorUnclaiming(), { closable: true });
                return;
            }
            // Use unclaim personal area method of the map editor mode manager
            await mapEditorModeManager.unclaimPersonalArea($personalAreaDataStore as unknown as AreaData);

            // Send analytics event
            analyticsClient.unclaimPersonalDesk();

            // Close the menu
            openedMenuStore.close("profileMenu");
        } catch (error) {
            console.error("Error while unclaiming personal desk", error);
            warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorUnclaiming(), { closable: true });
        }
    }

</script>

{#if $mapEditorMenuVisibleStore}
    <ActionBarButton
        on:click={toggleMapEditorMode}
        label={$LL.actionbar.mapEditor()}
        state={$mapEditorModeStore ? "active" : "normal"}
    >
        <IconMapEditor font-size="20" />
    </ActionBarButton>
{/if}
{#if $mapManagerActivated}
    <ActionBarButton on:click={toggleMapExplorerMode} label={$LL.mapEditor.sideBar.exploreTheRoom()}>
        <IconMapSearch font-size="20" />
    </ActionBarButton>
{/if}
{#if $globalMessageVisibleStore}
    <ActionBarButton on:click={toggleGlobalMessage} label={$LL.actionbar.globalMessage()}>
        <IconSpeakerPhone font-size="20" />
    </ActionBarButton>
{/if}
{#if $personalAreaDataStore}
<ActionBarButton
    label={$LL.actionbar.personalDesk.label()}
    on:click={goToPersonalDesk}
    state={$isInsidePersonalAreaStore ? "disabled" : "normal"}
    classList="group/btn-personal-desk"
>
    <IconDesk font-size="20" />
</ActionBarButton>
<ActionBarButton
    label={$LL.actionbar.personalDesk.unclaim()}
    on:click={unclaimPersonalDesk}
    classList="group/btn-personal-desk"
>
    <IconDesk font-size="20" />
</ActionBarButton>
{/if}

<AdditionalMenuItems menu="buildMenu" />
