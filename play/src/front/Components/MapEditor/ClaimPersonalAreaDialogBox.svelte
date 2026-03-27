<script lang="ts">
    import { onMount } from "svelte";
    import { mapEditorAskToClaimPersonalAreaStore } from "../../Stores/MapEditorStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import PopUpContainer from "../PopUp/PopUpContainer.svelte";
    import Input from "../Input/Input.svelte";

    let name = "";
    /** True if this user already owns another personal area on the map (may be replaced when claiming). */
    let alreadyHasPersonalArea = false;
    /** User acknowledged that the existing personal area will be removed. */
    let replaceExistingConfirmed = false;

    const mapEditorModeManager = gameManager.getCurrentGameScene().getMapEditorModeManager();

    function closeDialog() {
        mapEditorAskToClaimPersonalAreaStore.set(undefined);
    }

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

        const userUUID = localUserStore.getLocalUser()?.uuid;
        if (userUUID === undefined) {
            console.error("Unable to claim the area, your UUID is undefined");
            return;
        }
        const gameMapFrontWrapper = gameManager.getCurrentGameScene().getGameMapFrontWrapper();
        gameMapFrontWrapper.areasManager?.getAreasByPropertyType("personalAreaPropertyData").forEach((area) => {
            const property = area.areaData.properties.find((property) => property.type === "personalAreaPropertyData");
            if (
                property !== undefined &&
                property.type === "personalAreaPropertyData" &&
                property.ownerId === userUUID
            ) {
                alreadyHasPersonalArea = true;
            }
        });
    });
</script>

<div class="absolute w-fit bottom-0 left-0 right-0 pb-4 pointer-events-auto z-[150] m-auto hover:animate-none">
    {#if alreadyHasPersonalArea && !replaceExistingConfirmed}
        <PopUpContainer extraClasses="w-fit">
            <p class="m-0 mt-2 max-w-xs">{$LL.area.personalArea.alreadyHavePersonalArea()}</p>
            <div slot="buttons" class="flex flex-row justify-center items-center w-full">
                <button
                    data-testid="claimPersonalAreaReplaceConfirmButton"
                    type="button"
                    class="btn btn-secondary w-fit px-10"
                    on:click|preventDefault={() => (replaceExistingConfirmed = true)}
                >
                    {$LL.area.personalArea.buttons.confirm()}
                </button>
            </div>
        </PopUpContainer>
    {:else}
        <PopUpContainer extraClasses="w-fit">
            <p class="m-0 mt-2 max-w-xs">{$LL.area.personalArea.claimDescription()}</p>
            <Input
                id="claimPersonalAreaInput"
                type="text"
                label="Your Name"
                bind:value={name}
                onKeyDown={emitKeypressEvents}
            />
            <div slot="buttons" class="flex flex-row justify-center w-full gap-2">
                <button
                    type="button"
                    class="btn btn-outline w-fit px-10 hover:bg-contrast-600/50"
                    on:click|preventDefault={closeDialog}
                    >{$LL.area.personalArea.buttons.no()}
                </button>
                <button
                    data-testid="claimPersonalAreaButton"
                    type="button"
                    class="btn btn-secondary w-fit px-10"
                    on:click={() => {
                        mapEditorModeManager.claimPersonalArea(name);
                        closeDialog();
                    }}
                    >{$LL.area.personalArea.buttons.yes()}
                </button>
            </div>
        </PopUpContainer>
    {/if}
</div>
