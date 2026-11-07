<script lang="ts">
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import { isInsidePersonalAreaStore, personalAreaDataStore } from "../../../Stores/PersonalDeskStore";
    import { mapManagerActivated, mapEditorMenuVisibleStore, openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import {
        modalIframeStore,
        modalVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../../Stores/ModalStore";
    import { mapEditorModeStore, mapExplorationModeStore } from "../../../Stores/MapEditorStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { isTodoListVisibleStore } from "../../../Stores/TodoListStore";
    import { isCalendarVisibleStore } from "../../../Stores/CalendarStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { userIsAdminStore } from "../../../Stores/GameStore";
    import { megaphoneCanBeUsedStore } from "../../../Stores/MegaphoneStore";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { EditorToolName } from "../../../Phaser/Game/MapEditor/MapEditorModeManager";
    import AdditionalMenuItems from "./AdditionalMenuItems.svelte";
    import {
        IconMapSearch,
        IconDesk,
        IconDeskExit,
        IconSpeakerPhone,
        IconMapEditor,
        IconMessageShare,
    } from "@wa-icons";

    function resetChatVisibility() {
        chatVisibilityStore.set(false);
    }

    function resetModalVisibility() {
        modalVisibilityStore.set(false);
        modalIframeStore.set(null);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function toggleGlobalCommunication(mode: "text" | "live") {
        if ($showModalGlobalComminucationVisibilityStore === mode) {
            showModalGlobalComminucationVisibilityStore.set(false);
            return;
        }

        closeMapMenu();
        resetChatVisibility();
        resetModalVisibility();
        mapEditorModeStore.switchMode(false);
        if (mode === "text") analyticsClient.trackAdminEvent("global_message.opened", { source: "action_bar" });
        showModalGlobalComminucationVisibilityStore.set(mode);
    }

    function toggleMapEditorMode() {
        //if (isMobile) return;
        if ($mapEditorModeStore && !$mapExplorationModeStore) {
            analyticsClient.trackAdminEvent("map_editor.closed");
            mapEditorModeStore.switchMode(false);
            gameManager.getCurrentGameScene().getMapEditorModeManager()?.equipTool(undefined);
        } else {
            analyticsClient.trackAdminEvent("map_editor.opened");
            mapEditorModeStore.switchMode(true);
            gameManager.getCurrentGameScene().getMapEditorModeManager()?.equipTool(EditorToolName.EntityEditor);
        }
        isTodoListVisibleStore.set(false);
        isCalendarVisibleStore.set(false);
        closeMapMenu();
    }

    function toggleMapExplorerMode() {
        if ($mapExplorationModeStore) {
            gameManager.getCurrentGameScene().getMapEditorModeManager()?.equipTool(undefined);
            mapEditorModeStore.switchMode(false);
        } else {
            mapEditorModeStore.switchMode(true);
            gameManager.getCurrentGameScene().getMapEditorModeManager()?.equipTool(EditorToolName.ExploreTheRoom);
        }

        analyticsClient.trackAdminEvent("map_explorer.top_button_clicked");
        isTodoListVisibleStore.set(false);
        isCalendarVisibleStore.set(false);
        closeMapMenu();
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
            await mapEditorModeManager.unclaimPersonalArea($personalAreaDataStore);

            // Send analytics event
            analyticsClient.trackAdminEvent("personal_desk.unclaimed");

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
        onclick={toggleMapEditorMode}
        label={$LL.actionbar.mapEditor()}
        state={$mapEditorModeStore && !$mapExplorationModeStore ? "active" : "normal"}
    >
        <IconMapEditor font-size="20" />
    </ActionBarButton>
{/if}
{#if $mapManagerActivated}
    <ActionBarButton
        onclick={toggleMapExplorerMode}
        label={$LL.mapEditor.sideBar.exploreTheRoom()}
        state={$mapExplorationModeStore ? "active" : "normal"}
    >
        <IconMapSearch font-size="20" />
    </ActionBarButton>
{/if}
<!-- Each entry only for those allowed to use it, rather than a window of greyed-out buttons. -->
{#if $userIsAdminStore}
    <ActionBarButton
        onclick={() => toggleGlobalCommunication("text")}
        label={$LL.actionbar.sendAnnouncement()}
        state={$showModalGlobalComminucationVisibilityStore === "text" ? "active" : "normal"}
        dataTestId="send-announcement-button"
    >
        <IconMessageShare font-size="20" />
    </ActionBarButton>
{/if}
{#if $megaphoneCanBeUsedStore}
    <ActionBarButton
        onclick={() => toggleGlobalCommunication("live")}
        label={$LL.actionbar.goLive()}
        state={$showModalGlobalComminucationVisibilityStore === "live" ? "active" : "normal"}
        dataTestId="go-live-button"
    >
        <IconSpeakerPhone font-size="20" />
    </ActionBarButton>
{/if}
{#if $personalAreaDataStore}
    <ActionBarButton
        dataTestId="go-to-personal-desk-button"
        label={$LL.actionbar.personalDesk.label()}
        onclick={goToPersonalDesk}
        state={$isInsidePersonalAreaStore ? "disabled" : "normal"}
        classList="group/btn-personal-desk"
    >
        <IconDesk font-size="20" />
    </ActionBarButton>
    <ActionBarButton
        label={$LL.actionbar.personalDesk.unclaim()}
        onclick={unclaimPersonalDesk}
        classList="group/btn-personal-desk"
    >
        <IconDeskExit font-size="20" />
    </ActionBarButton>
{/if}

<AdditionalMenuItems menu="buildMenu" />
