<script lang="ts">
    import { fly } from "svelte/transition";
    import { helpCameraSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
    import { getNavigatorType, isAndroid as isAndroidFct, NavigatorType } from "../../WebRtc/DeviceUtils";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    let isAndroid = isAndroidFct();
    let isFirefox = getNavigatorType() === NavigatorType.firefox;
    let isChrome = getNavigatorType() === NavigatorType.chrome;

    function refresh() {
        window.location.reload();
    }

    function close() {
        helpCameraSettingsVisibleStore.set(false);
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
        <h2 class="tw-mb-0">{$LL.camera.help.title()}</h2>
        <p class="err blue-title">{$LL.camera.help.permissionDenied()}</p>
        <p>{$LL.camera.help.content()}</p>
        <p class="tw-mb-0 tw-flex tw-justify-center tw-flex-col">
            {#if isFirefox}
                <p class="err">
                    {$LL.camera.help.firefoxContent()}
                </p>
                <img
                    src={$LL.camera.help.screen.firefox()}
                    alt="help camera setup"
                    class="tw-rounded-lg tw-w-5/6 md:tw-w-80 tw-m-auto"
                />
            {:else if isChrome && !isAndroid}
                <img
                    src={$LL.camera.help.screen.chrome()}
                    alt="help camera setup"
                    class="tw-rounded-lg tw-w-5/6 md:tw-w-80 tw-m-auto"
                />
            {/if}
        </p>
    </section>
    <section class="tw-flex tw-row tw-justify-center">
        <button class="light" on:click|preventDefault={refresh}>{$LL.camera.help.refresh()}</button>
        <button type="submit" class="outline" on:click|preventDefault={close}>{$LL.camera.help.continue()}</button>
    </section>
</form>
