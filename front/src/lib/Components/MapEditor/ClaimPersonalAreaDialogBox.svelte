<script lang="ts">
    import { onMount } from "svelte";
    import { PersonalAreaPropertyData } from "@workadventure/map-editor";
    import { mapEditorAskToClaimPersonalAreaStore } from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { notificationPlayingStore } from "../../Stores/NotificationStore";
    import { localUserStore } from "../../Connection/LocalUserStore";

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

        // Defined query to ask if the user be able to claim the area
        const userUUID = localUserStore.getLocalUser()?.uuid;
        if (userUUID === undefined) {
            console.error("Unable to claim the area, your UUID is undefined");
            return;
        }
        const gameMapFrontWrapper = gameManager.getCurrentGameScene().getGameMapFrontWrapper();
        gameMapFrontWrapper.areasManager?.getAreasByPropertyType("personalAreaPropertyData").forEach((area) => {
            const property = area.areaData.properties.find(
                (property) => property.type === "personalAreaPropertyData"
            ) as PersonalAreaPropertyData | undefined;
            if (property !== undefined && property.ownerId === userUUID) {
                // If the user already has a personal area, we do not allow him to claim another one
                notificationPlayingStore.playNotification($LL.area.personalArea.alreadyHavePersonalArea());
            }
        });
    });
</script>

<div
    class="interact-menu bg-dark-purple/80 backdrop-blur-md rounded-3xl text-white text-center w-72 absolute bottom-36 left-0 right-0 pointer-events-auto z-[150] m-auto px-10 py-3 animate-pulse hover:animate-none"
>
    <p class="mt-2">{$LL.area.personalArea.claimDescription()}</p>
    <label for="claimPersonalAreaInput" class="text-left text-xs m-0 p-0">Your name</label>
    <input
        id="claimPersonalAreaInput"
        type="text"
        class="w-full mt-2 p-2 rounded-md bg-dark-purple/60 text-white border-none"
        bind:value={name}
        on:keypress={emitKeypressEvents}
    />
    <div class="flex flex-row justify-evenly">
        <button
            data-testid="claimPersonalAreaButton"
            type="button"
            class="btn light accept-request"
            on:click={() => mapEditorModeManager.claimPersonalArea(name)}
            >{$LL.area.personalArea.buttons.yes()}
        </button>
        <button
            type="button"
            class="btn outline refuse-request text-white border-none "
            on:click|preventDefault={() => mapEditorAskToClaimPersonalAreaStore.set(undefined)}
            >{$LL.area.personalArea.buttons.no()}
        </button>
    </div>
</div>
