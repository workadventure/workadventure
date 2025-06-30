<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { EnableCameraScene } from "../../Phaser/Login/EnableCameraScene";
    import { EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import {
        requestedCameraDeviceIdStore,
        batchGetUserMediaStore,
        cameraListStore,
        localStreamStore,
        localVolumeStore,
        requestedMicrophoneDeviceIdStore,
        microphoneListStore,
        speakerListStore,
        requestedCameraState,
        requestedMicrophoneState,
        speakerSelectedStore,
    } from "../../Stores/MediaStore";
    import type { Game } from "../../Phaser/Game/Game";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import MicOnIcon from "../Icons/MicOnIcon.svelte";
    import CamOnIcon from "../Icons/CamOnIcon.svelte";
    export let game: Game;
    import { gameManager } from "../../Phaser/Game/GameManager";

    import bgMap from "../images/map-exemple.png";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";
    import SelectMicrophone from "./SelectMicrophone.svelte";
    import SelectCamera from "./SelectCamera.svelte";
    import SelectSpeaker from "./SelectSpeaker.svelte";

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName) as EnableCameraScene;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "#6e1946";
    let legals = gameManager.currentStartedRoom?.legals ?? {};

    let selectedCamera: string | undefined = undefined;
    let selectedMicrophone: string | undefined = undefined;
    const sound = new Audio("/resources/objects/webrtc-in.mp3");

    let legalStrings: string[] = [];
    if (legals?.termsOfUseUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.termsOfUseUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.termsOfUse() +
                "</a>"
        );
    }
    if (legals?.privacyPolicyUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.privacyPolicyUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.privacyPolicy() +
                "</a>"
        );
    }
    if (legals?.cookiePolicyUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.cookiePolicyUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.cookiePolicy() +
                "</a>"
        );
    }

    let legalString: string | undefined;
    if (legalStrings.length > 0) {
        if (Intl.ListFormat) {
            const formatter = new Intl.ListFormat($locale, { style: "long", type: "conjunction" });
            legalString = formatter.format(legalStrings);
        } else {
            // For old browsers
            legalString = legalStrings.join(", ");
        }
    }

    function submit() {
        selectCamera(selectedCamera);
        selectMicrophone(selectedMicrophone);
        enableCameraScene.login();
    }

    function srcObject(node: HTMLVideoElement, stream: MediaStream) {
        node.srcObject = stream;
        return {
            update(newStream: MediaStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream;
                }
            },
        };
    }

    let stream: MediaStream | undefined;

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;

            if (stream !== undefined) {
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    selectedCamera = videoTracks[0].getSettings().deviceId;
                } else {
                    selectedCamera = undefined;
                }
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    selectedMicrophone = audioTracks[0].getSettings().deviceId;
                } else {
                    selectedMicrophone = undefined;
                }
            }
        } else {
            stream = undefined;
            selectedCamera = undefined;
            selectedMicrophone = undefined;
        }
    });

    onDestroy(() => {
        unsubscribeLocalStreamStore();
    });

    onMount(() => {
        //init the component to enable webcam and microphone
        batchGetUserMediaStore.startBatch();
        myCameraStore.set(true);
        myMicrophoneStore.set(true);
        requestedCameraState.enableWebcam();

        requestedMicrophoneState.enableMicrophone();

        batchGetUserMediaStore.commitChanges();
        sound.load();
    });

    function handleSelectCamera(event: CustomEvent<string | undefined>) {
        selectCamera(event.detail);
    }

    function handleSelectMicrophone(event: CustomEvent<string | undefined>) {
        selectMicrophone(event.detail);
    }

    function handleSelectSpeaker(event: CustomEvent<string | undefined>) {
        selectSpeaker(event.detail);
    }

    function selectCamera(newCameraSelected: string | undefined = undefined) {
        selectedCamera = newCameraSelected;
        if (!selectedCamera) {
            localUserStore.setPreferredVideoInputDevice("");
            requestedCameraState.disableWebcam();
            return;
        }
        requestedCameraState.enableWebcam();
        requestedCameraDeviceIdStore.set(selectedCamera);
        localUserStore.setPreferredVideoInputDevice(selectedCamera);
    }

    function selectMicrophone(newMicrophoneSelected: string | undefined = undefined) {
        selectedMicrophone = newMicrophoneSelected;
        if (!selectedMicrophone) {
            localUserStore.setPreferredAudioInputDevice("");
            requestedMicrophoneState.disableMicrophone();
            return;
        }
        requestedMicrophoneState.enableMicrophone();
        requestedMicrophoneDeviceIdStore.set(selectedMicrophone);
        localUserStore.setPreferredAudioInputDevice(selectedMicrophone);
    }

    function selectSpeaker(deviceId: string | undefined) {
        localUserStore.setSpeakerDeviceId(deviceId ?? "");
        speakerSelectedStore.set(deviceId);
    }

    function playSoundClick() {
        sound.play().catch((e) => console.error(e));
    }
    /* eslint-disable svelte/no-at-html-tags */
</script>

<form class="enableCameraScene pointer-events-auto relative z-30 m-0 px-2" on:submit|preventDefault={submit}>
    <section class="flex  min-h-dvh ">
        <div
            class="text-white justify-center items-center overflow-hidden  w-[100vw] container  flex flex-col min-h-dvh pb-24 pt-8 lg:pt-0 relative "
        >
            <section class="mb-4 text-center">
                <h2 class="h4">{$LL.camera.enable.title()}</h2>
                <p class="opacity-50 w-2/3 m-auto pt-2 hidden md:block">
                    {$LL.camera.enable.start()}
                </p>
            </section>

            <div
                class="flex md:flex-wrap flex-col lg:space-x-4 w-full items-center justify-center lg:flex-row  lg:items-stretch lg:px-4 lg:pb-4 "
            >
                <!-- MICROPHONE -->

                <SelectMicrophone
                    on:selectDevice={handleSelectMicrophone}
                    deviceList={$microphoneListStore ?? []}
                    selectedDevice={selectedMicrophone}
                >
                    <MicOnIcon height="h-8" width="w-8" slot="icon" />
                    <span slot="title">{$LL.actionbar.subtitle.microphone()}</span>

                    <div class="absolute top-4 start-0 flex justify-center w-full " slot="widget">
                        <HorizontalSoundMeterWidget spectrum={$localVolumeStore} />
                    </div>
                </SelectMicrophone>

                <!-- CAMERA -->
                <SelectCamera
                    on:selectDevice={handleSelectCamera}
                    deviceList={$cameraListStore ?? []}
                    selectedDevice={selectedCamera}
                >
                    <CamOnIcon height="h-8" width="w-8" slot="icon" />
                    <span slot="title">{$LL.camera.editCam()}</span>
                    <span slot="widget">
                        {#if selectedCamera !== undefined && $localStreamStore.type === "success" && $localStreamStore.stream}
                            <video
                                class="myCamVideoSetup flex items-center  justify-center w-full   aspect-video overflow-hidden scale-x-[-1]"
                                use:srcObject={$localStreamStore.stream}
                                autoplay
                                muted
                                playsinline
                            />
                        {:else}
                            <div
                                class="webrtcsetup flex items-center justify-center w-full aspect-video rounded-lg overflow-hidden bg-contrast"
                            >
                                CAM PB <!-- TODO HUGO : catch pb with cam -->
                            </div>
                        {/if}
                    </span>
                </SelectCamera>

                <!-- SPEAKER -->
                {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
                    <SelectSpeaker
                        on:playSound={playSoundClick}
                        on:selectDevice={handleSelectSpeaker}
                        deviceList={$speakerListStore ?? []}
                        selectedDevice={$speakerSelectedStore}
                    />
                {/if}
            </div>
            <div
                class="fixed bottom-0 start-0  !w-[100vw] bg-contrast/80 backdrop-blur-md border border-solid border-t border-b-0 border-x-0 border-white/10"
            >
                <section
                    class="container m-auto p-4 flex flex-col-reverse md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4 "
                >
                    <button
                        type="submit"
                        class="btn btn-light btn-lg btn-ghost w-full md:w-1/2 
              
                     hidden">{$LL.actionbar.cancel()}</button
                    >
                    <!-- TODO ACTION -->
                    <button type="submit" class="btn btn-secondary btn-lg w-full md:w-1/2 block"
                        >{$LL.menu.settings.save()}</button
                    >
                </section>
                {#if legalString}
                    <section class="terms-and-conditions h-fit z-40 text-center w-full">
                        <a style="display: none;" href="traduction">Need for traduction</a>
                        <p class="text-white text-xs italic opacity-50">
                            {@html $LL.login.terms({
                                links: legalString,
                            })}
                        </p>
                    </section>
                {/if}
            </div>
        </div>
    </section>
</form>
<div class="absolute start-0 top-0 w-dvw h-dvh bg-cover z-10" style="background-image: url('{bgMap}');" />
<div class="absolute start-0 top-0 w-dvw h-dvh bg-contrast/80 z-20" style="background-color: '{bgColor}';" />

<style lang="scss">
    .enableCameraScene {
        h2 {
            margin: 1px;
        }

        section.text-center {
            text-align: center;
        }
    }
</style>
