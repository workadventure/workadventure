<script lang="ts">
    import { onDestroy } from "svelte";
    import { showModalGlobalComminucationVisibilityStore } from "../../Stores/ModalStore";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        cameraListStore,
        displayedMegaphoneScreenStore,
        localVolumeStore,
        microphoneListStore,
        requestedCameraDeviceIdStore,
        requestedCameraState,
        requestedMicrophoneDeviceIdStore,
        requestedMicrophoneState,
        streamingMegaphoneStore,
        localStreamStore,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
    } from "../../Stores/MediaStore";
    import LL from "../../../i18n/i18n-svelte";
    import microphoneImg from "../images/mic.svg";
    import cameraImg from "../images/cam.svg";
    import { srcObject } from "../Video/utils";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { StringUtils } from "../../Utils/StringUtils";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { requestedMegaphoneStore } from "../../Stores/MegaphoneStore";
    import { startMegaphoneLive, stopMegaphoneLive } from "../ActionBar/MenuIcons/megaphoneActions";
    import Tooltip from "../Util/Tooltip.svelte";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Select from "../Input/Select.svelte";
    import Button from "../UI/Button.svelte";
    import { IconAlertTriangle, IconSpeakerPhone } from "@wa-icons";

    let stream: MediaStream | undefined = $state();

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;
        } else {
            stream = undefined;
        }
    });

    onDestroy(() => {
        unsubscribeLocalStreamStore();
        displayedMegaphoneScreenStore.set(false);
    });

    // "Go live" in the map menu opens this sheet straight on the megaphone.
    activateLiveMessage();

    function close() {
        streamingMegaphoneStore.set(false);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }

    function activateLiveMessage() {
        streamingMegaphoneStore.set(true);
        displayedMegaphoneScreenStore.set(true);
        analyticsClient.trackAdminEvent("megaphone.opened");
    }

    // Sync with MediaSettingsList: prefer used store, then requested, then current stream
    let cameraSelectValue = $derived(
        $usedCameraDeviceIdStore ??
            $requestedCameraDeviceIdStore ??
            stream?.getVideoTracks()[0]?.getSettings()?.deviceId,
    );

    let microphoneSelectValue = $derived(
        $usedMicrophoneDeviceIdStore ??
            $requestedMicrophoneDeviceIdStore ??
            stream?.getAudioTracks()[0]?.getSettings()?.deviceId,
    );

    function selectCamera(deviceId: string) {
        requestedCameraDeviceIdStore.set(deviceId);
        localUserStore.setPreferredVideoInputDevice(deviceId);
    }

    function selectMicrophone(deviceId: string) {
        requestedMicrophoneDeviceIdStore.set(deviceId);
        localUserStore.setPreferredAudioInputDevice(deviceId);
    }

    function onCameraSelectChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        if (target?.value) selectCamera(target.value);
    }

    function onMicrophoneSelectChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        if (target?.value) selectMicrophone(target.value);
    }

    function startLive() {
        startMegaphoneLive();
        //close();
    }

    function stopLive() {
        stopMegaphoneLive();
        close();
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    class="absolute z-[308] rounded-xxl w-full h-full top-0 left-0 right-0 bottom-0 flex items-center justify-center overflow-hidden"
>
    <div
        class="h-full md:h-auto md:top-auto md:left-auto md:right-auto md:bottom-auto bg-contrast/80 backdrop-blur rounded-md max-h-screen overflow-y-auto w-full lg:w-11/12"
    >
        <!-- transition:fly={{ x: 1000, duration: 500 }} -->
        <!-- <div class="bg-contrast/80 ml-2 -right-20 top-4 transition-all backdrop-blur rounded-lg p-2 aspect-square">
            <button type="button" class="close-window h-[16px] w-[16px] bg-red-500 justify-center" onclick|preventDefault|stopPropagation={close}
                >&times</button
            >
        </div> -->
        <header class="flex flex-row items-start justify-between p-2">
            <div class="flex flex-col gap-2 p-4">
                <h2 class="text-center text-white mobile text-base md:text-xl lg:text-2xl flex items-center gap-2">
                    <IconSpeakerPhone font-size="22" />
                    {$LL.megaphone.modal.liveMessage.title()}
                </h2>
            </div>
            <div class="group/btn-chat transition-all" id="btn-chat">
                <ButtonClose onclick={close} />
            </div>
        </header>
        <div class="px-5 h-full">
            {#if $displayedMegaphoneScreenStore}
                <div id="active-liveMessage" class="flex flex-col p-5 text-white">
                    <div class="flex flex-col md:flex-row justify-center">
                        <div class="flex flex-col mr-5">
                            <video
                                class="h-full w-full md:object-cover rounded"
                                class:object-contain={stream}
                                class:max-h-[230px]={stream}
                                style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                                use:srcObject={stream}
                                autoplay
                                muted
                                playsinline
                            ></video>
                            <div class="z-[251] mt-3 w-full p-4 flex items-center justify-center scale-150">
                                <SoundMeterWidget
                                    volume={$localVolumeStore}
                                    cssClass="!bg-none !bg-transparent scale-150"
                                    barColor="blue"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col pl-6">
                            <h3 class="text-white">{$LL.megaphone.modal.liveMessage.settings()}</h3>
                            <p class="text-white text-sm">
                                {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                                    {$LL.warning.megaphoneNeeds()}
                                {:else}
                                    {$LL.megaphone.modal.liveMessage.goingToStream()}
                                    {$requestedCameraState ? $LL.megaphone.modal.liveMessage.yourCamera() : ""}
                                    {$requestedCameraState && $requestedMicrophoneState && !$requestedScreenSharingState
                                        ? $LL.megaphone.modal.liveMessage.and()
                                        : ""}
                                    {$requestedCameraState && $requestedMicrophoneState && $requestedScreenSharingState
                                        ? ","
                                        : ""}
                                    {$requestedMicrophoneState ? $LL.megaphone.modal.liveMessage.yourMicrophone() : ""}
                                    {($requestedCameraState || $requestedMicrophoneState) &&
                                    $requestedScreenSharingState
                                        ? $LL.megaphone.modal.liveMessage.and()
                                        : ""}
                                    {$requestedScreenSharingState ? $LL.megaphone.modal.liveMessage.yourScreen() : ""}
                                    {$LL.megaphone.modal.liveMessage.toAll()}.
                                {/if}
                            </p>
                            <div class="flex flex-row items-center gap-3">
                                <img
                                    src={cameraImg}
                                    style="padding: 2px; height: 32px; width: 32px;"
                                    alt="Turn off microphone"
                                />
                                <div class="w-full">
                                    <Select value={cameraSelectValue} onchange={onCameraSelectChange}>
                                        {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 0}
                                            {#each $cameraListStore as camera (camera.deviceId)}
                                                <option value={camera.deviceId}>
                                                    {StringUtils.normalizeDeviceName(camera.label)}
                                                </option>
                                            {/each}
                                        {/if}
                                    </Select>
                                </div>
                            </div>
                            <div class="flex flex-row items-center gap-3">
                                <img
                                    src={microphoneImg}
                                    style="padding: 2px; height: 32px; width: 32px; "
                                    alt="Turn off microphone"
                                />
                                <div class="w-full">
                                    <Select value={microphoneSelectValue} onchange={onMicrophoneSelectChange}>
                                        {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
                                            {#each $microphoneListStore as microphone (microphone.deviceId)}
                                                <option value={microphone.deviceId}>
                                                    {StringUtils.normalizeDeviceName(microphone.label)}
                                                </option>
                                            {/each}
                                        {/if}
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex flew-row justify-center">
                        {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                            <span class="err text-warning-900 text-xs italic mt-1">
                                <IconAlertTriangle font-size="12" />
                                {$LL.warning.megaphoneNeeds()}
                            </span>
                        {/if}
                    </div>
                    <div class="flex flew-row justify-center">
                        {#if !$requestedMegaphoneStore}
                            <Button
                                class="font-light [&_.btn-label]:text-black bg-white mt-4 rounded-md disabled:bg-[#4a5568] disabled:cursor-not-allowed"
                                onclick={startLive}
                                disabled={!$requestedCameraState && !$requestedMicrophoneState}
                            >
                                {#if !$requestedCameraState && !$requestedMicrophoneState && !$requestedScreenSharingState}
                                    <Tooltip text={$LL.warning.megaphoneNeeds()} />
                                {/if}
                                {$LL.megaphone.modal.liveMessage.startMegaphone()}
                            </Button>
                        {:else}
                            <Button variant="danger" onclick={stopLive}>
                                {$LL.megaphone.modal.liveMessage.stopMegaphone()}
                            </Button>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    video {
        transition: all 0.2s ease-in-out;
        &:hover {
            scale: 1.1;
        }
    }
</style>
