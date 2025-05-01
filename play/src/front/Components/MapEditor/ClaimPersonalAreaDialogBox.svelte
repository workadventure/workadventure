<script lang="ts">
    import { onMount } from "svelte";
    import { mapEditorAskToClaimPersonalAreaStore } from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { notificationPlayingStore } from "../../Stores/NotificationStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import PopUpContainer from "../PopUp/PopUpContainer.svelte";
    import Input from "../Input/Input.svelte";

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
            const property = area.areaData.properties.find((property) => property.type === "personalAreaPropertyData");
            if (property !== undefined && property.ownerId === userUUID) {
                // If the user already has a personal area, we do not allow him to claim another one
                notificationPlayingStore.playNotification($LL.area.personalArea.alreadyHavePersonalArea());
            }
        });
    });
</script>

<div
    class="w-2/5 max-w-3xl absolute bottom-12 left-0 right-0 pointer-events-auto z-[150] m-auto animate-pulse hover:animate-none"
>
    <PopUpContainer>
        <p class="mt-2">{$LL.area.personalArea.claimDescription()}</p>
        <Input
            id="claimPersonalAreaInput"
            type="text"
            label="Your Name"
            bind:value={name}
            onKeyDown={emitKeypressEvents}
        />
        <div slot="buttons" class="flex flex-row justify-content-center w-full gap-2">
            <button
                type="button"
                class="btn btn-outline w-full hover:bg-contrast-600/50"
                on:click|preventDefault={() => mapEditorAskToClaimPersonalAreaStore.set(undefined)}
                >{$LL.area.personalArea.buttons.no()}
            </button>
            <button
                data-testid="claimPersonalAreaButton"
                type="button"
                class="btn btn-secondary w-full"
                on:click={() => mapEditorModeManager.claimPersonalArea(name)}
                >{$LL.area.personalArea.buttons.yes()}
            </button>
        </div>
    </PopUpContainer>
</div>
