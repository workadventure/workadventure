<script lang="ts">
    import { mapEditorAskToClaimPersonalAreaStore } from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    const mapEditorModeManager = gameManager.getCurrentGameScene().getMapEditorModeManager();
</script>

<div
    class="interact-menu blue-dialog-box outline-light tw-text-center tw-w-72 tw-absolute tw-bottom-36 tw-left-0 tw-right-0 tw-pointer-events-auto tw-z-[150] tw-m-auto"
>
    <p class="tw-mt-2">{$LL.area.personalArea.claimDescription()}</p>
    <div class="tw-flex tw-flex-row tw-justify-evenly">
        <button
            data-testid="claimPersonalAreaButton"
            type="button"
            class="btn light accept-request"
            on:click={() => mapEditorModeManager.claimPersonalArea()}
            >{$LL.area.personalArea.buttons.yes()}
        </button>
        <button
            type="button"
            class="btn outline refuse-request"
            on:click|preventDefault={() => mapEditorAskToClaimPersonalAreaStore.set(undefined)}
            >{$LL.area.personalArea.buttons.no()}
        </button>
    </div>
</div>
