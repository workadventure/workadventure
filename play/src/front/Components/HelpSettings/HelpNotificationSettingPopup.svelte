<script lang="ts">
    import { fly } from "svelte/transition";
    import { helpNotificationSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
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
        helpNotificationSettingsVisibleStore.set(false);
    }

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }
</script>

<form
    class="helpNotificationSettings z-[600] backdrop-blur-sm bg-dark-purple/80 rounded text-white self-center p-3 pointer-events-auto flex flex-col m-auto w-full md:w-2/3 2xl:w-1/4 text-sm md:text-base"
    style={getBackgroundColor() ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="mb-0">
        <h2 class="mb-0">{$LL.notification.help.title()}</h2>
        <p class="err blue-title">{$LL.notification.help.permissionDenied()}</p>
        <p>{$LL.notification.help.content()}</p>
        <p class="mb-0 flex justify-center flex-col">
            {#if isFirefox}
                <p class="err">
                    {$LL.notification.help.firefoxContent()}
                </p>
                <img
                    src={$LL.notification.help.screen.firefox()}
                    alt="help camera setup"
                    class="rounded-lg w-5/6 md:w-80 m-auto"
                />
            {:else if isChrome && !isAndroid}
                <img
                    src={$LL.notification.help.screen.chrome()}
                    alt="help camera setup"
                    class="rounded-lg w-5/6 md:w-80 m-auto"
                />
            {/if}
        </p>
    </section>
    <section class="flex row justify-center">
        <button class="light" on:click|preventDefault={refresh}>{$LL.notification.help.refresh()}</button>
        <button type="submit" class="outline" on:click|preventDefault={close}>{$LL.notification.help.continue()}</button
        >
    </section>
</form>
