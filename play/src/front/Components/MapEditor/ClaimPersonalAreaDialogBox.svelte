<script lang="ts">
    import { onMount } from "svelte";
    import { mapEditorAskToClaimPersonalAreaStore } from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    let name = "";
    const mapEditorModeManager = gameManager.getCurrentGameScene().getMapEditorModeManager();

    // function to check key press and if it is enter key then click on yes button
    function emitKeypressEvents(event: KeyboardEvent) {
        if (event.key === "Enter") {
            const claimPersonalAreaButton = document.querySelector("[data-testid=claimPersonalAreaButton]");
            claimPersonalAreaButton?.dispatchEvent(new MouseEvent("click"));
        }
    }

    onMount(() => {
        // set name to current user name
        name = gameManager.getCurrentGameScene().CurrentPlayer.playerName;
    });
</script>

<div
    class="interact-menu tw-bg-dark-purple/80 tw-backdrop-blur-md tw-rounded-3xl tw-text-white tw-text-center tw-w-72 tw-absolute tw-bottom-36 tw-left-0 tw-right-0 tw-pointer-events-auto tw-z-[150] tw-m-auto tw-px-10 tw-py-3 tw-animate-pulse hover:tw-animate-none"
>
    <p class="tw-mt-2">{$LL.area.personalArea.claimDescription()}</p>
    <label for="claimPersonalAreaInput" class="tw-text-left tw-text-xs tw-m-0 tw-p-0">Your name</label>
    <input
        id="claimPersonalAreaInput"
        type="text"
        class="tw-w-full tw-mt-2 tw-p-2 tw-rounded-md tw-bg-dark-purple/60 tw-text-white tw-border-none"
        bind:value={name}
        on:keypress={emitKeypressEvents}
    />
    <div class="tw-flex tw-flex-row tw-justify-evenly">
        <button
            data-testid="claimPersonalAreaButton"
            type="button"
            class="btn light accept-request"
            on:click={() => mapEditorModeManager.claimPersonalArea(name)}
            >{$LL.area.personalArea.buttons.yes()}
        </button>
        <button
            type="button"
            class="btn outline refuse-request tw-text-white tw-border-none "
            on:click|preventDefault={() => mapEditorAskToClaimPersonalAreaStore.set(undefined)}
            >{$LL.area.personalArea.buttons.no()}
        </button>
    </div>
</div>
