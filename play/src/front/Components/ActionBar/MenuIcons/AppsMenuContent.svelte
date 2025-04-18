<script lang="ts">
    import { setContext } from "svelte";
    import { get } from "svelte/store";
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

        console.log("1showRoomList", get(openedMenuStore));
        roomListVisibilityStore.set(true);
        openedMenuStore.closeAll();
        console.log("2showRoomList", get(openedMenuStore));
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
{#if $roomListActivated}
    <div on:click|stopPropagation={showRoomList} on:keydown|stopPropagation={showRoomList}>
        <ActionBarButton label={$LL.actionbar.help.roomList.title()}>
            <WorldIcon />
        </ActionBarButton>
    </div>
{/if}

<!-- Calendar integration -->
<ActionBarButton
    on:click={openExternalModuleCalendar}
    label={$LL.actionbar.calendar()}
    state={$isCalendarActivatedStore ? "normal" : "disabled"}
>
    <IconCalendar width="20" height="20" />
</ActionBarButton>

<ActionBarButton
    on:click={openExternalModuleTodoList}
    label={$LL.actionbar.todoList()}
    state={$isTodoListActivatedStore ? "normal" : "disabled"}
>
    <IconCheckList width="20" height="20" />
</ActionBarButton>

<!-- External module action bar -->
<ExternalComponents zone="actionBarAppsMenu" />
