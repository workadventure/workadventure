<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        mapEditorWamSettingsEditorToolCurrentMenuItemStore,
        WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM,
    } from "../../Stores/MapEditorStore";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import Megaphone from "./ConfigureMyRoom/Megaphone.svelte";
    import RoomSettings from "./ConfigureMyRoom/RoomSettings.svelte";

    import { IconChevronRight } from "@wa-icons";

    let isVisible: boolean;

    onMount(() => {
        isVisible = true;
    });

    onDestroy(() => {
        isVisible = false;
    });

    function getCurrentComponent(): typeof Megaphone | typeof RoomSettings {
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

<div class="configure-my-room" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
    <div class="absolute top-2 right-2 hover:bg-white/10">
        <button
            class="close-window {isVisible ? 'visible' : ''} text-2xl mr-2"
            on:click|preventDefault|stopPropagation={close}>&#215;</button
        >
    </div>
    <div class="menu mx-auto flex flex-col">
        <h3 style="color: white;">{$LL.mapEditor.sideBar.configureMyRoom()}</h3>
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
                    <IconChevronRight class={`-mr-2`} />
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
                <IconChevronRight class={`-mr-2`} />
            </li>
        </ul>
    </div>
    <div class="content space-y-6 space   ">
        {#if $mapEditorWamSettingsEditorToolCurrentMenuItemStore !== undefined}
            <svelte:component this={getCurrentComponent()} />
        {/if}
    </div>
</div>
