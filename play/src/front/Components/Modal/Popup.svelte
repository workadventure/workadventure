<script lang="ts">
    import { fly } from "svelte/transition";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";
    import { modalPopupVisibilityStore } from "../../Stores/ModalStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";

    let notAskAgain = false;

    function close() {
        modalPopupVisibilityStore.set(false);
    }

    function onChangesAskAgain() {
        localStorage.setItem("notAskAgainPopupExplorerMode", `${notAskAgain}`);
    }

    function activeExplorerMode() {
        analyticsClient.toggleMapEditor(!$mapEditorModeStore);
        mapEditorModeStore.switchMode(!$mapEditorModeStore);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.ExploreTheRoom);
        modalPopupVisibilityStore.set(false);
    }
</script>

<div class="popup-menu tw-min-h-fit tw-rounded-3xl tw-overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    <button type="button" class="close-window !tw-bg-transparent !tw-border-none " on:click={close}>&times</button>
    <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
        <h1 class="tw-p-2">{$LL.mapEditor.explorer.popup.title()}</h1>
        <video
            src="https://workadventure-chat-uploads.s3.eu-west-1.amazonaws.com/upload/video/tuto-mapexplorer.mov"
            class="tw-w-full tw-mb-4"
            controls
            muted
            autoplay
        />
        <p class="tw-p-0 tw-m-0">
            {$LL.mapEditor.explorer.popup.content()}
        </p>
        <p class="tw-p-0 tw-m-0 tw-mt-8">
            <input type="checkbox" id="askagain" bind:checked={notAskAgain} on:change={onChangesAskAgain} />
            <label for="askagain">{$LL.mapEditor.explorer.popup.notAskAgain()}</label>
        </p>
    </div>
    <div
        class="footer tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
    >
        <button on:click={close} class="tw-bg-dark-purple tw-p-4"> {$LL.mapEditor.explorer.popup.close()} </button>
        <button on:click={activeExplorerMode} class="light tw-p-4"> {$LL.mapEditor.explorer.popup.continue()} </button>
    </div>
</div>

<style lang="scss">
    .popup-menu {
        position: absolute;
        width: 668px;
        height: max-content !important;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 5%;
        left: calc(50% - 334px);

        .close-window {
            right: 0px;
            border-radius: 15px;
            box-shadow: none !important;
            &:hover {
                transform: scale(1.5);
            }
        }
    }

    @media (max-height: 700px) {
        .popup-menu {
            height: 100vh !important;
            top: 0;
            .footer {
                position: fixed;
                bottom: 0;
            }
        }
    }
</style>
