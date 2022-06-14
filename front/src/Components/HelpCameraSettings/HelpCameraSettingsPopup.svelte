<script lang="ts">
    import { fly } from "svelte/transition";
    import { helpCameraSettingsVisibleStore } from "../../Stores/HelpCameraSettingsStore";
    import { getNavigatorType, isAndroid as isAndroidFct, NavigatorType } from "../../WebRtc/DeviceUtils";
    import LL from "../../i18n/i18n-svelte";

    let isAndroid = isAndroidFct();
    let isFirefox = getNavigatorType() === NavigatorType.firefox;
    let isChrome = getNavigatorType() === NavigatorType.chrome;

    function refresh() {
        window.location.reload();
    }

    function close() {
        helpCameraSettingsVisibleStore.set(false);
    }
</script>

<form
    class="helpCameraSettings tw-z-[600] tw-bg-dark-purple tw-rounded tw-text-white tw-self-center tw-p-3 tw-pointer-events-auto"
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section>
        <h2>{$LL.camera.help.title()}</h2>
        <p class="err blue-title">{$LL.camera.help.permissionDenied()}</p>
        <p>{$LL.camera.help.content()}</p>
        <p>
            {#if isFirefox}
                <p class="err">
                    {$LL.camera.help.firefoxContent()}
                </p>
                <img src={$LL.camera.help.screen.firefox()} alt="" />
            {:else if isChrome && !isAndroid}
                <img src={$LL.camera.help.screen.chrome()} alt="" />
            {/if}
        </p>
    </section>
    <section class="tw-flex tw-row">
        <button class="helpCameraSettingsFormRefresh light" on:click|preventDefault={refresh}
            >{$LL.camera.help.refresh()}</button
        >
        <button type="submit" class="helpCameraSettingsFormContinue outline" on:click|preventDefault={close}
            >{$LL.camera.help.continue()}</button
        >
    </section>
</form>

<style lang="scss">
    //.helpCameraSettings {
    //    pointer-events: auto;
    //    background: #eceeee;
    //    margin-left: auto;
    //    margin-right: auto;
    //    position: absolute;
    //    left: 0;
    //    right: 0;
    //    margin-top: 4%;
    //    max-height: 80vh;
    //    max-width: 80vw;
    //    margin-left: 10%;
    //    margin-right: 10%;
    //    z-index: 600;
    //    overflow: auto;
    //    text-align: center;
    //
    //    h2 {
    //        font-family: "Press Start 2P";
    //    }
    //
    //    section {
    //        p {
    //            margin: 15px;
    //            font-family: "Press Start 2P";
    //
    //            & .err {
    //                color: #ff0000;
    //            }
    //        }
    //        img {
    //            max-width: 500px;
    //            width: 100%;
    //        }
    //    }
    //}
</style>
