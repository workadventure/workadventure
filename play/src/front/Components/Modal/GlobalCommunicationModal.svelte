<script lang="ts">
    import { onDestroy } from "svelte";
    import { showModalGlobalComminucationVisibilityStore } from "../../Stores/ModalStore";
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
    import { srcObject } from "../Video/utils";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { StringUtils } from "../../Utils/StringUtils";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { requestedMegaphoneStore } from "../../Stores/MegaphoneStore";
    import { startMegaphoneLive, stopMegaphoneLive } from "../ActionBar/MenuIcons/megaphoneActions";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Select from "../Input/Select.svelte";
    import Button from "../UI/Button.svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import {
        IconAlertTriangle,
        IconCamera,
        IconCameraOff,
        IconMicrophone,
        IconSpeakerPhone,
        IconUsers,
        IconWorld,
    } from "@wa-icons";

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

    // Who hears the live is set in the map settings (megaphone scope), not chosen here: shown, not asked.
    const reachesWholeWorld =
        gameManager.getCurrentGameScene().getGameMap().getWamFile()?.getWam()?.settings?.megaphone?.scope !== "ROOM";

    let hasVideo = $derived(Boolean($requestedCameraState && stream?.getVideoTracks().length));
    let canGoLive = $derived($requestedCameraState || $requestedMicrophoneState);

    function startLive() {
        startMegaphoneLive();
    }

    function stopLive() {
        stopMegaphoneLive();
        close();
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    class="absolute z-[308] w-full h-full inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
>
    <div
        class="pointer-events-auto bg-contrast/80 backdrop-blur rounded-md max-h-screen overflow-y-auto w-full md:w-[46rem] text-white"
        data-testid="go-live-sheet"
    >
        <header class="flex flex-row items-center justify-between p-4 pb-2">
            <h2 class="text-base md:text-xl m-0 flex items-center gap-2">
                <IconSpeakerPhone font-size="22" />
                {$LL.actionbar.goLive()}
            </h2>
            <ButtonClose onclick={close} />
        </header>
        {#if $displayedMegaphoneScreenStore}
            <div class="flex flex-col gap-4 p-4 pt-2">
                <!-- Camera off by default: the live can be the microphone alone. -->
                <div
                    class="relative aspect-video rounded-md bg-contrast overflow-hidden flex items-center justify-center"
                >
                    {#if hasVideo}
                        <video
                            class="h-full w-full object-cover"
                            style="transform: scaleX(-1);"
                            use:srcObject={stream}
                            autoplay
                            muted
                            playsinline
                        ></video>
                    {:else}
                        <div class="flex flex-col items-center gap-1 text-center px-4">
                            <IconCameraOff font-size="28" />
                            <span class="font-bold">{$LL.megaphone.modal.liveMessage.cameraOff()}</span>
                            <span class="text-sm text-white/70">{$LL.megaphone.modal.liveMessage.cameraOffHint()}</span>
                        </div>
                    {/if}
                    {#if $requestedMegaphoneStore}
                        <span
                            class="absolute top-2 left-2 rounded-full bg-danger text-white text-sm font-bold px-3 py-1"
                        >
                            ● {$LL.megaphone.modal.liveMessage.live()}
                        </span>
                    {/if}
                    {#if $requestedMicrophoneState}
                        <div class="absolute bottom-2 right-2">
                            <SoundMeterWidget
                                volume={$localVolumeStore}
                                cssClass="!bg-none !bg-transparent"
                                barColor="blue"
                            />
                        </div>
                    {/if}
                </div>

                <section class="flex flex-col gap-2">
                    <h3 class="text-sm uppercase text-white/60 m-0">{$LL.megaphone.modal.liveMessage.devices()}</h3>
                    <div class="flex flex-row items-center gap-3">
                        <IconCamera font-size="20" />
                        <div class="w-full">
                            <Select
                                value={$requestedCameraState ? cameraSelectValue : ""}
                                onchange={onCameraSelectChange}
                            >
                                {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 0}
                                    {#each $cameraListStore as camera (camera.deviceId)}
                                        <option value={camera.deviceId}>
                                            {StringUtils.normalizeDeviceName(camera.label)}
                                        </option>
                                    {/each}
                                {:else}
                                    <option value="">{$LL.megaphone.modal.liveMessage.cameraOff()}</option>
                                {/if}
                            </Select>
                        </div>
                    </div>
                    <div class="flex flex-row items-center gap-3">
                        <IconMicrophone font-size="20" />
                        <div class="w-full">
                            <Select
                                value={$requestedMicrophoneState ? microphoneSelectValue : ""}
                                onchange={onMicrophoneSelectChange}
                            >
                                {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 0}
                                    {#each $microphoneListStore as microphone (microphone.deviceId)}
                                        <option value={microphone.deviceId}>
                                            {StringUtils.normalizeDeviceName(microphone.label)}
                                        </option>
                                    {/each}
                                {:else}
                                    <option value="">{$LL.megaphone.modal.liveMessage.microphoneOff()}</option>
                                {/if}
                            </Select>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 class="text-sm uppercase text-white/60 mb-2">{$LL.megaphone.modal.liveMessage.whoHears()}</h3>
                    <p class="m-0 flex items-center gap-2">
                        {#if reachesWholeWorld}
                            <IconWorld font-size="18" />
                            {$LL.megaphone.modal.liveMessage.wholeWorld()}
                        {:else}
                            <IconUsers font-size="18" />
                            {$LL.megaphone.modal.liveMessage.thisRoom()}
                        {/if}
                    </p>
                </section>

                <footer class="flex flex-wrap items-center justify-end gap-2">
                    {#if !canGoLive}
                        <p class="m-0 me-auto text-sm flex items-center gap-1 text-warning-400">
                            <IconAlertTriangle font-size="16" />
                            {$LL.warning.megaphoneNeeds()}
                        </p>
                    {/if}
                    {#if !$requestedMegaphoneStore}
                        <Button variant="danger" onclick={startLive} disabled={!canGoLive} dataTestId="go-live-start">
                            {$LL.actionbar.goLive()}
                        </Button>
                    {:else}
                        <div
                            class="flex items-center justify-between gap-3 w-full rounded-md bg-danger px-4 py-2"
                            data-testid="go-live-on-air"
                        >
                            <span class="font-bold">● {$LL.megaphone.modal.liveMessage.live()}</span>
                            <Button variant="light" appearance="border" onclick={stopLive}>
                                {$LL.megaphone.modal.liveMessage.stop()}
                            </Button>
                        </div>
                    {/if}
                </footer>
            </div>
        {/if}
    </div>
</div>
