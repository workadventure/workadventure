<script lang="ts">
    import { setContext } from "svelte";
    import { openedMenuStore, roomListActivated } from "../../../Stores/MenuStore";
    import ActionBarButton from "../ActionBarButton.svelte";
    import ExternalComponents from "../../ExternalModules/ExternalComponents.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import {
        isActivatedStore as isCalendarActivatedStore,
        isCalendarVisibleStore,
    } from "../../../Stores/CalendarStore";
    import {
        isActivatedStore as isTodoListActivatedStore,
        isTodoListVisibleStore,
    } from "../../../Stores/TodoListStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import {
        modalIframeStore,
        modalVisibilityStore,
        roomListVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../../Stores/ModalStore";
    import { mapEditorModeStore } from "../../../Stores/MapEditorStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import WorldIcon from "../../Icons/WorldIcon.svelte";
    import { userIsAdminStore } from "../../../Stores/GameStore";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import { showRecordingList } from "../../../Stores/RecordingStore";
    import { IconCalendar, IconCheckList } from "@wa-icons";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    function resetChatVisibility() {
        chatVisibilityStore.set(false);
    }

    function resetModalVisibility() {
        modalVisibilityStore.set(false);
        modalIframeStore.set(null);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function showRoomList() {
        analyticsClient.openedRoomList();
        resetChatVisibility();
        resetModalVisibility();

        roomListVisibilityStore.set(true);
        openedMenuStore.closeAll();
    }

    function openExternalModuleCalendar() {
        analyticsClient.openExternalModuleCalendar();
        isCalendarVisibleStore.set(!$isCalendarVisibleStore);
        isTodoListVisibleStore.set(false);
        mapEditorModeStore.switchMode(false);
        openedMenuStore.closeAll();
    }

    function openExternalModuleTodoList() {
        analyticsClient.openExternalModuleTodoList();
        isTodoListVisibleStore.set(!$isTodoListVisibleStore);
        isCalendarVisibleStore.set(false);
        mapEditorModeStore.switchMode(false);
        openedMenuStore.closeAll();
    }
</script>

<!-- Room list part -->
{#if $roomListActivated || $userIsAdminStore}
    <ActionBarButton
        on:click={showRoomList}
        on:keydown={showRoomList}
        label={$LL.actionbar.help.roomList.title()}
        state={$roomListActivated ? "normal" : "disabled"}
    >
        <WorldIcon />
    </ActionBarButton>
{/if}

<ActionBarButton
    on:click={() => {
        $showRecordingList = true;
    }}
    label="recording"
    state="normal"
>
    <StartRecordingIcon width="20" height="20" />
</ActionBarButton>

<!-- Calendar integration -->
{#if $isCalendarActivatedStore || $userIsAdminStore}
    <ActionBarButton
        on:click={openExternalModuleCalendar}
        label={$LL.actionbar.calendar()}
        state={$isCalendarActivatedStore ? "normal" : "disabled"}
    >
        <IconCalendar width="20" height="20" />
    </ActionBarButton>
{/if}

{#if $isTodoListActivatedStore || $userIsAdminStore}
    <ActionBarButton
        on:click={openExternalModuleTodoList}
        label={$LL.actionbar.todoList()}
        state={$isTodoListActivatedStore ? "normal" : "disabled"}
    >
        <IconCheckList width="20" height="20" />
    </ActionBarButton>
{/if}

<!-- External module action bar -->
<ExternalComponents zone="actionBarAppsMenu" />
