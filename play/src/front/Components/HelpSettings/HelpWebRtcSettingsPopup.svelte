<script lang="ts">
    import { fly } from "svelte/transition";
    import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    function refresh() {
        window.location.reload();
    }

    function close() {
        helpWebRtcSettingsVisibleStore.set(false);
    }

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }
</script>

<form
    class="helpCameraSettings tw-z-[600] tw-bg-dark-purple tw-rounded tw-text-white tw-self-center tw-p-3 tw-pointer-events-auto tw-flex tw-flex-col tw-m-auto tw-w-full md:tw-w-2/3 2xl:tw-w-1/4 tw-text-sm md:tw-text-base"
    style={getBackgroundColor() ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="tw-mb-0">
        <h2 class="tw-mb-0">{$LL.camera.webrtc.title()}</h2>
        <p class="err blue-title">{$LL.camera.webrtc.error()}</p>
        <p>{$LL.camera.webrtc.content()}</p>
        <p class="tw-mb-0 tw-flex tw-justify-center tw-flex-col">
            <a href="https://icetest.info/" target="_blank" rel="noreferrer">{$LL.camera.webrtc.testUrl()}</a>
        </p>
    </section>
    <section class="tw-flex tw-row tw-justify-center">
        <button class="light" on:click|preventDefault={refresh}>{$LL.camera.webrtc.refresh()}</button>
        <button type="submit" class="outline" on:click|preventDefault={close}>{$LL.camera.webrtc.continue()}</button>
    </section>
</form>
