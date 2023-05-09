<script lang="ts">
    import { fly } from "svelte/transition";
    import { ChevronRightIcon } from "svelte-feather-icons";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        CONFIGURE_MY_ROOM_MENU_ITEM,
        mapEditorConfigureMyRoomCurrentMenuItemStore,
    } from "../../Stores/MapEditorStore";
    import Megaphone from "./ConfigureMyRoom/Megaphone.svelte";

    function getCurrentComponent() {
        switch ($mapEditorConfigureMyRoomCurrentMenuItemStore) {
            case CONFIGURE_MY_ROOM_MENU_ITEM.Megaphone: {
                return Megaphone;
            }
            default: {
                return "Component not found.";
            }
        }
    }

    function close() {
        mapEditorConfigureMyRoomCurrentMenuItemStore.set(undefined);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.EntityEditor);
    }
</script>

<div class="configure-my-room" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
    <button class="close-window" on:click={close}>&#215;</button>
    <div class="menu">
        <h3>{$LL.mapEditor.sideBar.configureMyRoom()}</h3>
        <ul>
            <li
                class:selected={$mapEditorConfigureMyRoomCurrentMenuItemStore === CONFIGURE_MY_ROOM_MENU_ITEM.Megaphone}
                on:click={() => mapEditorConfigureMyRoomCurrentMenuItemStore.set(CONFIGURE_MY_ROOM_MENU_ITEM.Megaphone)}
            >
                <span>Megaphone</span>
                <ChevronRightIcon class={`tw--mr-2`} />
            </li>
        </ul>
    </div>
    <div class="content">
        {#if $mapEditorConfigureMyRoomCurrentMenuItemStore !== undefined}
            <svelte:component this={getCurrentComponent()} />
        {/if}
    </div>
</div>
