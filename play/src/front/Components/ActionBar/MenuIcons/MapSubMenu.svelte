<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { fly } from "svelte/transition";
    import { streamingMegaphoneStore } from "../../../Stores/MediaStore";
    import {
        backOfficeMenuVisibleStore,
        globalMessageVisibleStore,
        mapEditorMenuVisibleStore,
        mapMenuVisibleStore,
        openedMenuStore,
    } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { liveStreamingEnabledStore, requestedMegaphoneStore } from "../../../Stores/MegaphoneStore";
    import AdminPanIcon from "../../Icons/AdminPanIcon.svelte";
    import AdjustmentsIcon from "../../Icons/AdjustmentsIcon.svelte";
    import MessageGlobalIcon from "../../Icons/MessageGlobalIcon.svelte";
    import ChevronDownIcon from "../../Icons/ChevronDownIcon.svelte";
    import MegaphoneConfirm from "../MegaphoneConfirm.svelte";
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
    import SubMenuItem from "./SubMenuItem.svelte";

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
    }

    function openBo() {
        if (!ADMIN_BO_URL) {
            throw new Error("ADMIN_BO_URL not set");
        }
        const url = new URL(ADMIN_BO_URL, window.location.href);
        url.searchParams.set("playUri", window.location.href);
        window.open(url, "_blank");
    }

    function close() {
        openedMenuStore.close("mapMenu");
    }
</script>

{#if $mapMenuVisibleStore}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        data-testid="map-menu"
        class="items-center relative transition-all hidden @lg/actions:block cursor-pointer pointer-events-auto"
        on:click={() => {
            openedMenuStore.toggle("mapMenu");
        }}
        use:clickOutside={close}
        on:blur={() => {
            openedMenuStore.close("mapMenu");
        }}
    >
        <div
            class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2 transition-all"
        >
            <div
                class="flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded space-x-2 pl-4 pr-3"
            >
                <AdminPanIcon />
                <div class="pr-2">
                    <div
                        class="font-bold text-white leading-3 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base"
                    >
                        {$LL.actionbar.map()}
                    </div>
                </div>
                <ChevronDownIcon
                    strokeWidth="2"
                    classList="h-4 w-4 aspect-square transition-all opacity-50 {$openedMenuStore === 'mapMenu'
                        ? 'rotate-180'
                        : ''}"
                    height="16px"
                    width="16px"
                />
            </div>
        </div>
        {#if $openedMenuStore === "mapMenu"}
            <div
                class="absolute mt-2 top-14 @xl/actions:top-16 right-0 bg-contrast/80 backdrop-blur rounded-md w-56 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 transition-all"
                data-testid="map-sub-menu"
                transition:fly={{ y: 40, duration: 150 }}
            >
                <div class="p-1 m-0">
                    {#if $mapEditorMenuVisibleStore}
                        <SubMenuItem on:click={() => toggleMapEditorMode()}>
                            <svg
                                slot="icon"
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z"
                                    stroke="white"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                            <span slot="label">{$LL.actionbar.mapEditor()}</span>
                        </SubMenuItem>
                    {/if}
                    {#if $backOfficeMenuVisibleStore}
                        <SubMenuItem on:click={() => openBo()}>
                            <AdjustmentsIcon slot="icon" />
                            <span slot="label">{$LL.actionbar.bo()}</span>
                        </SubMenuItem>
                    {/if}
                    {#if $globalMessageVisibleStore}
                        <SubMenuItem on:click={() => toggleGlobalMessage()}>
                            <MessageGlobalIcon slot="icon" />
                            <span slot="label">{$LL.actionbar.globalMessage()}</span>
                        </SubMenuItem>
                    {/if}
                    <!--{#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}-->
                    <!--    <li-->
                    <!--        class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"-->
                    <!--    >-->
                    <!--        <div-->
                    <!--            class="transition-all w-6 h-6 aspect-square text-center"-->
                    <!--            data-testid="megaphone"-->
                    <!--        >-->
                    <!--            <MegaphoneIcon />-->
                    <!--        </div>-->
                    <!--        <div>{$LL.actionbar.megaphone()}</div>-->
                    <!--    </li>-->
                    <!--{/if}-->
                </div>
                {#if $streamingMegaphoneStore}
                    <MegaphoneConfirm />
                {/if}
            </div>
        {/if}
    </div>
{/if}
