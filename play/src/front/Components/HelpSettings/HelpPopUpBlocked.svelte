<script lang="ts">
    import { fly } from "svelte/transition";
    import { getNavigatorType } from "../../WebRtc/DeviceUtils";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { helpSettingsPopupBlockedStore } from "../../Stores/HelpSettingsPopupBlockedStore";

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }

    function close() {
        helpSettingsPopupBlockedStore.set(false);
    }
</script>

<form
    class="helpCameraSettings z-[600] bg-contrast/80 backdrop-blur rounded-lg text-white self-center pointer-events-auto flex flex-col m-auto w-full md:w-2/3 2xl:w-1/4 text-sm md:text-base"
    style={getBackgroundColor() ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="mb-0 p-4">
        <h2 class="mb-0">{$LL.warning.popupBlocked.title()}</h2>
        <p>{$LL.warning.popupBlocked.content()}</p>
        <p class="mb-0 flex justify-center flex-col">
            <img
                class="rounded-lg w-5/6 md:w-80 m-auto"
                src={`/resources/help-popup-blocked/${getNavigatorType()}-popupblocked.png`}
                alt={$LL.warning.popupBlocked.content()}
            />
        </p>
    </section>

    <section class="justify-center bottom-0 w-full bg-contrast p-4 flex flex-row space-x-4 mt-4 rounded-b-lg">
        <button class="btn btn-secondary grow" on:click|preventDefault={close}>{$LL.warning.popupBlocked.done()}</button
        >
    </section>
</form>
