<script lang="ts">
    import { openedMenuStore, roomListActivated } from "../../../Stores/MenuStore";
    import tooltipArrow from "../../images/arrow-top.svg";
    import AppsIcon from "../../Icons/AppsIcon.svelte";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
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
    import { externalSvelteComponentService } from "../../../Stores/Utils/externalSvelteComponentService";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import {
        modalIframeStore,
        modalVisibilityStore,
        roomListVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../../Stores/ModalStore";
    import { mapEditorModeStore } from "../../../Stores/MapEditorStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { IconCalendar, IconCheckList } from "@wa-icons";

    const externalActionBarSvelteComponent = externalSvelteComponentService.getComponentsByZone("actionBar");

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
        openedMenuStore.close("appMenu");
    }

    function openExternalModuleCalendar() {
        analyticsClient.openExternalModuleCalendar();
        isCalendarVisibleStore.set(!$isCalendarVisibleStore);
        isTodoListVisibleStore.set(false);
        mapEditorModeStore.switchMode(false);
        openedMenuStore.close("appMenu");
    }

    function openExternalModuleTodoList() {
        analyticsClient.openExternalModuleTodoList();
        isTodoListVisibleStore.set(!$isTodoListVisibleStore);
        isCalendarVisibleStore.set(false);
        mapEditorModeStore.switchMode(false);
        openedMenuStore.close("appMenu");
    }

    function noDrag(): boolean {
        return false;
    }
</script>

<ActionBarButtonWrapper classList="group/btn-apps">
    <ActionBarIconButton
        on:click={() => {
            openedMenuStore.toggle("appMenu");
        }}
        tooltipTitle={$LL.actionbar.help.apps.title()}
        tooltipDesc={$LL.actionbar.help.apps.desc()}
        disabledHelp={$openedMenuStore === "appMenu"}
        state={$openedMenuStore === "appMenu" ? "active" : "normal"}
        dataTestId={undefined}
    >
        <AppsIcon
            strokeColor={$openedMenuStore === "appMenu" ? "stroke-white fill-white" : "stroke-white fill-transparent"}
            hover="group-hover/btn-apps:fill-white"
        />
    </ActionBarIconButton>

    {#if $openedMenuStore === "appMenu" && ($roomListActivated || $isCalendarActivatedStore || $isTodoListActivatedStore || $externalActionBarSvelteComponent.size > 0)}
        <div class="flex justify-center m-auto absolute -left-1.5 top-[69px]">
            <img
                alt="Sub menu arrow"
                loading="eager"
                src={tooltipArrow}
                class="content-[''] absolute -top-1 left-9 m-auto w-2 h-1"
            />
            <div class="bottom-action-bar">
                <div class="bottom-action-section flex flex-col animate bg-contrast/80 backdrop-blur-md rounded-md p-1">
                    <!-- Room list part -->
                    {#if $roomListActivated}
                        <!-- TODO button hep -->
                        <!-- Room list button -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:dragstart|preventDefault={noDrag} on:click={showRoomList} class="bottom-action-button">
                            <!--
                            {#if !isMobile}
                                <HelpTooltip
                                    title={$LL.actionbar.help.roomList.title()}
                                    desc={$LL.actionbar.help.roomList.desc()}
                                />
                            {/if}
                            -->

                            <button
                                id="roomListIcon"
                                class="hover:bg-white/10 rounded flex w-full space-x-2 items-center p-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    width="20"
                                    height="20"
                                    stroke-width="1.5"
                                >
                                    <path d="M21 12a9 9 0 1 0 -9 9" />
                                    <path d="M3.6 9h16.8" />
                                    <path d="M3.6 15h7.9" />
                                    <path d="M11.5 3a17 17 0 0 0 0 18" />
                                    <path d="M12.5 3a16.984 16.984 0 0 1 2.574 8.62" />
                                    <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                                    <path d="M20.2 20.2l1.8 1.8" />
                                </svg>
                                <div class="whitespace-nowrap bold text-sm grow pr-2 text-left">
                                    {$LL.actionbar.help.roomList.title()}
                                </div>
                            </button>
                        </div>
                    {/if}

                    <!-- Calendar integration -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={openExternalModuleCalendar}
                        class="bottom-action-button"
                    >
                        <!--
                        {#if !isMobile}
                            <HelpTooltip
                                title={$isCalendarActivatedStore
                                    ? $LL.actionbar.help.calendar.title()
                                    : $LL.actionbar.featureNotAvailable()}
                                desc={$isCalendarActivatedStore
                                    ? $LL.actionbar.help.calendar.desc()
                                    : ""}
                            />
                        {/if}
                        -->
                        <button
                            id="calendarIcon"
                            class="hover:bg-white/10 rounded flex w-full space-x-2 items-center p-2"
                            class:!cursor-not-allowed={!$isCalendarActivatedStore}
                            class:!no-pointer-events={!$isCalendarActivatedStore}
                            disabled={!$isCalendarActivatedStore}
                        >
                            <IconCalendar width="20" height="20" />
                            <div class="whitespace-nowrap bold text-sm grow pr-2 text-left">
                                {$LL.actionbar.calendar()}
                            </div>
                        </button>
                    </div>

                    <!-- Todo List Integration -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={openExternalModuleTodoList}
                        class="bottom-action-button"
                    >
                        <!--
                        {#if !isMobile}
                            <HelpTooltip
                                title={$isTodoListActivatedStore
                                    ? $LL.actionbar.help.todolist.title()
                                    : $LL.actionbar.featureNotAvailable()}
                                desc={$isTodoListActivatedStore
                                    ? $LL.actionbar.help.todolist.desc()
                                    : ""}
                            />
                        {/if}
                        -->
                        <button
                            id="todoListIcon"
                            class="hover:bg-white/10 rounded flex w-full space-x-2 items-center p-2"
                            class:!cursor-not-allowed={!$isTodoListActivatedStore}
                            class:!no-pointer-events={!$isTodoListActivatedStore}
                            disabled={!$isTodoListActivatedStore}
                        >
                            <IconCheckList width="20" height="20" />
                            <div class="whitespace-nowrap bold text-sm grow pr-2 text-left">
                                {$LL.actionbar.todoList()}
                            </div>
                        </button>
                    </div>
                </div>

                <div class="bottom-action-section flex animate">
                    <!-- External module action bar -->
                    <ExternalComponents zone="actionBar" />
                </div>
            </div>
        </div>
    {/if}
</ActionBarButtonWrapper>
