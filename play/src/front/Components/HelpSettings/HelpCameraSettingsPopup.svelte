<script lang="ts">
    import { fly } from "svelte/transition";
    import { getNavigatorType, isAndroid as isAndroidFct, NavigatorType } from "../../WebRtc/DeviceUtils";
    import { LL } from "../../../i18n/i18n-svelte";
    import Alert from "../UI/Alert.svelte";
    import { popupStore } from "../../Stores/PopupStore";

    let isAndroid = isAndroidFct();
    let isFirefox = getNavigatorType() === NavigatorType.firefox;
    let isChrome = getNavigatorType() === NavigatorType.chrome;
    let showDetails = false;

    function allow() {
        showDetails = !showDetails;
    }

    function close() {
        popupStore.removePopup("cameraAccessDenied");
    }
</script>

<form
    class="helpCameraSettings z-[600] bg-contrast/80 backdrop-filter text-center rounded-lg text-white self-center pointer-events-auto flex flex-col w-full md:w-2/3 xl:w-[380px] text-sm md:text-base overflow-hidden"
    on:submit|preventDefault={close}
    transition:fly={{ y: -50, duration: 500 }}
>
    <section class="mb-0">
        <div class="mb-0 text-lg bold border border-solid border-transparent border-b-white/20 bg-white/10 px-4 py-3">
            {$LL.camera.help.title()}
        </div>
        {#if showDetails}
            <div class="px-4 mt-4">
                <Alert>
                    {$LL.camera.help.permissionDenied()}
                </Alert>
            </div>
            <div class="p-4 italic opacity-50 text-sm leading-4">
                {$LL.camera.help.content()}
            </div>
            {#if isFirefox}
                <p class="err">
                    {$LL.camera.help.firefoxContent()}
                </p>
            {/if}
            <div class="h-72 overflow-hidden opacity-80 saturate-50">
                {#if isFirefox}
                    <img src={$LL.camera.help.screen.firefox()} alt="help camera setup" class="w-full m-auto" />
                {:else if isChrome && !isAndroid}
                    <img src={$LL.camera.help.screen.chrome()} alt="help camera setup" class="w-full m-auto" />
                {/if}
            </div>
        {/if}
    </section>
    <section class="flex row justify-center p-4 bg-contrast">
        <button class="btn btn-sm btn-border btn-success mr-2 w-full justify-center" on:click|preventDefault={allow}
            >{$LL.camera.help.allow()}</button
        >
        <button type="submit" class="btn btn-danger btn-sm w-full justify-center" on:click|preventDefault={close}
            >{$LL.camera.help.continue()}</button
        >
    </section>
</form>
