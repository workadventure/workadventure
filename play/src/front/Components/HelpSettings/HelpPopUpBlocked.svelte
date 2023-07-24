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
    class="helpCameraSettings tw-z-[600] tw-bg-dark-purple tw-rounded tw-text-white tw-self-center tw-p-3 tw-pointer-events-auto tw-flex tw-flex-col tw-m-auto tw-w-full md:tw-w-2/3 2xl:tw-w-1/4 tw-text-sm md:tw-text-base"
    style={getBackgroundColor() ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="tw-mb-0">
        <h2 class="tw-mb-0">{$LL.warning.popupBlocked.title()}</h2>
        <p>{$LL.warning.popupBlocked.content()}</p>
        <p class="tw-mb-0 tw-flex tw-justify-center tw-flex-col">
            <img
                class="tw-rounded-lg tw-w-5/6 md:tw-w-80 tw-m-auto"
                src={`/resources/help-popup-blocked/${getNavigatorType()}-popupblocked.png`}
                alt={$LL.warning.popupBlocked.content()}
            />
        </p>
    </section>

    <section class="tw-flex tw-row tw-justify-center">
        <button class="light" on:click|preventDefault={close}>{$LL.warning.popupBlocked.done()}</button>
    </section>
</form>
