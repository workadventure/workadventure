<script lang="ts">
    import { ComponentType, onDestroy, onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        mapEditorWamSettingsEditorToolCurrentMenuItemStore,
        WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM,
    } from "../../Stores/MapEditorStore";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Megaphone from "./ConfigureMyRoom/Megaphone.svelte";
    import RoomSettings from "./ConfigureMyRoom/RoomSettings.svelte";

    import { IconChevronRight } from "@wa-icons";

    let isVisible: boolean;

    onMount(() => {
        isVisible = true;
        if ($userIsAdminStore) {
            mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.RoomSettings);
        } else {
            mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.Megaphone);
        }
    });

    onDestroy(() => {
        isVisible = false;
    });

    function getCurrentComponent(): ComponentType {
        switch ($mapEditorWamSettingsEditorToolCurrentMenuItemStore) {
            case WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.Megaphone: {
                return Megaphone;
            }
            case WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.RoomSettings: {
                return RoomSettings;
            }
            default: {
                return RoomSettings; // Default appropriate component.
            }
        }
    }

    function close() {
        mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(undefined);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.EntityEditor);
    }
</script>

<div>
    <div
        class="configure-my-room bg-contrast/80 overflow-hidden backdrop-blur-md flex flex-col justify-between absolute rounded-lg w-4/6 min-h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-fit z-[260]"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
    >
        <div class="absolute top-2 right-2 z-50 close-window {isVisible ? 'visible' : ''} ">
            <ButtonClose on:click={close} size="md" />
        </div>
        <div class="flex flex-wrap w-full grow max-h-[70vh] overflow-auto">
            <div class="menu mx-auto flex flex-col relative">
                <div class="sticky top-0 left-0 w-full">
                    <h3>{$LL.mapEditor.sideBar.configureMyRoom()}</h3>
                    <ul>
                        <!-- check if the user has right to update room settings -->
                        {#if $userIsAdminStore}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <li
                                class:selected={$mapEditorWamSettingsEditorToolCurrentMenuItemStore ===
                                    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.RoomSettings}
                                on:click={() =>
                                    mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(
                                        WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.RoomSettings
                                    )}
                            >
                                <span>{$LL.mapEditor.settings.room.title()}</span>
                                <IconChevronRight class="-mr-2" />
                            </li>
                        {/if}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <li
                            class:selected={$mapEditorWamSettingsEditorToolCurrentMenuItemStore ===
                                WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.Megaphone}
                            on:click={() =>
                                mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(
                                    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.Megaphone
                                )}
                        >
                            <span>{$LL.mapEditor.settings.megaphone.title()}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="content space-y-6 space overflow-y-scroll">
                {#if $mapEditorWamSettingsEditorToolCurrentMenuItemStore !== undefined}
                    <svelte:component this={getCurrentComponent()} />
                {/if}
            </div>
        </div>

        <div class="w-full h-fit flex items-center justify-center p-2 space-x-2 bg-contrast/50 pointer-events-auto">
            <div class="flex flex-row justify-content-center w-full gap-2">
                <button
                    class="btn btn-outline hover:bg-white/10 w-full close-window"
                    on:click|preventDefault|stopPropagation={close}
                    >close
                </button>
            </div>
        </div>
    </div>
</div>
