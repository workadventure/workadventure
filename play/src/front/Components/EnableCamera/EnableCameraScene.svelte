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
    import { StringUtils } from "../../Utils/StringUtils";
    import { myCameraStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
    import { localUserStore } from "../../Connection/LocalUserStore";

    export let game: Game;
    import { gameManager } from "../../Phaser/Game/GameManager";
    import CamOnIcon from "../Icons/CamOnIcon.svelte";
    import CamOffIcon from "../Icons/CamOffIcon.svelte";
    import MicOnIcon from "../Icons/MicOnIcon.svelte";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import VolumeIcon from "../Icons/VolumeIcon.svelte";
    import bgMap from "../images/map-exemple.png";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";

    const enableCameraScene = game.scene.getScene(EnableCameraSceneName) as EnableCameraScene;
    const bgColor = gameManager.currentStartedRoom.backgroundColor ?? "#1B2A41";
    let legals = gameManager.currentStartedRoom?.legals ?? {};

    let cameraEdit = false;
    let microphoneEdit = false;
    let speakerEdit = false;
    let selectedCamera: string | undefined = undefined;
    let selectedMicrophone: string | undefined = undefined;

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
        selectCamera();
        selectMicrophone();
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

    let stream: MediaStream | null;

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;

            if (stream !== null) {
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    selectedCamera = videoTracks[0].getSettings().deviceId;
                }
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    selectedMicrophone = audioTracks[0].getSettings().deviceId;
                }
            }
        } else {
            stream = null;
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
    });

    function selectCamera(selectedCamera: string | undefined = undefined) {
        if (selectedCamera == undefined) {
            localUserStore.setPreferredVideoInputDevice("");
            requestedCameraState.disableWebcam();
            return;
        }
        requestedCameraState.enableWebcam();
        requestedCameraDeviceIdStore.set(selectedCamera);
        localUserStore.setPreferredVideoInputDevice(selectedCamera);
    }

    function selectMicrophone(selectedMicrophone: string | undefined = undefined) {
        if (selectedMicrophone == undefined) {
            localUserStore.setPreferredAudioInputDevice("");
            requestedMicrophoneState.disableMicrophone();
            return;
        }
        requestedMicrophoneState.enableMicrophone();
        requestedMicrophoneDeviceIdStore.set(selectedMicrophone);
        localUserStore.setPreferredAudioInputDevice(selectedMicrophone);
    }

    function selectSpeaker(deviceId: string) {
        localUserStore.setSpeakerDeviceId(deviceId);
        speakerSelectedStore.set(deviceId);
    }
</script>

<form class="enableCameraScene pointer-events-auto relative z-30 m-0" on:submit|preventDefault={submit}>
    <section class="flex items-center justify-center min-h-screen ">
        <div class="text-white container mx-auto flex flex-col items-center justify-center">
            <section class="mb-4 text-center">
                <h2 class="h4">{$LL.camera.enable.title()}</h2>
                <p class="opacity-50 w-2/3 m-auto">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
                    et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                    aliquip ex ea commodo consequat.<!-- Trad -->
                </p>
            </section>

            <div class="flex space-x-4 items-start">
                <div class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 flex flex-col justify-center items-center">
                    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2">
                        <MicOnIcon height="h-8" width="w-8" />
                        <div class="grow pr-8">Your microphone <!-- Trad --></div>
                        <button
                            class="btn {!microphoneEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                            on:click|stopPropagation|preventDefault={() => (microphoneEdit = !microphoneEdit)}
                        >
                            {!microphoneEdit ? "Edit mic" : "Cancel"}
                            <!-- Trad -->
                        </button>
                    </div>

                    <div class="flex items-center justify-center">
                        <div class="flex flex-wrap items-center justify-center min-h-[129px]">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="border border-solid border-white rounded-lg pr-8 pl-6 pb-4 m-2 items-center justify-center space-x-4 transition-all cursor-pointer relative {selectedMicrophone ==
                                undefined
                                    ? 'bg-white text-secondary pt-12'
                                    : 'over:bg-white/10 pt-4'} {(microphoneEdit && selectedMicrophone != undefined) ||
                                (!microphoneEdit && selectedMicrophone == undefined)
                                    ? 'flex'
                                    : 'hidden'}"
                                on:click={() => {
                                    selectMicrophone(undefined);
                                    microphoneEdit = false;
                                }}
                            >
                                <div
                                    class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedMicrophone ==
                                    undefined
                                        ? 'bg-secondary border-secondary'
                                        : 'border-white'}"
                                >
                                    {#if selectedMicrophone == undefined}
                                        <CheckIcon width="w-4" height="h-4" />
                                    {/if}
                                </div>
                                <div class="space-y-1">
                                    <div
                                        class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight flex items-center"
                                    >
                                        <MicOffIcon height="h-4" width="w-4" />
                                        {$LL.audio.disable()}
                                    </div>
                                    {#if selectedMicrophone == undefined}
                                        <span class="chip chip-sm chip-secondary !inline-block">
                                            <span class="chip-label">Active</span><!-- Trad -->
                                        </span>
                                    {:else}
                                        <span class="chip chip-sm chip-neutral !inline-block">
                                            <span class="chip-label">Not recommended</span><!-- Trad -->
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            {#each $microphoneListStore ?? [] as microphone (microphone.deviceId)}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="border border-solid border-white rounded-lg pr-8 pl-6 pb-4 m-2 items-center justify-center space-x-4 transition-all cursor-pointer relative {selectedMicrophone ===
                                    microphone.deviceId
                                        ? 'bg-white text-secondary pt-12'
                                        : 'hover:bg-white/10 pt-4'} {(microphoneEdit &&
                                        selectedMicrophone !== microphone.deviceId) ||
                                    (!microphoneEdit && selectedMicrophone === microphone.deviceId)
                                        ? 'flex'
                                        : 'hidden'}"
                                    on:click={() => {
                                        selectMicrophone(microphone.deviceId);
                                        microphoneEdit = false;
                                    }}
                                >
                                    {#if microphone.deviceId === selectedMicrophone}
                                        <div class="absolute top-4 left-0 flex justify-center w-full">
                                            <HorizontalSoundMeterWidget spectrum={$localVolumeStore} />
                                        </div>
                                    {/if}
                                    <div
                                        class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedMicrophone ===
                                        microphone.deviceId
                                            ? 'bg-secondary border-secondary'
                                            : 'border-white'}"
                                    >
                                        {#if selectedMicrophone === microphone.deviceId}
                                            <CheckIcon width="w-4" height="h-4" />
                                        {/if}
                                    </div>
                                    <div class="space-y-1">
                                        <div
                                            class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight"
                                        >
                                            {StringUtils.normalizeDeviceName(microphone.label)}
                                        </div>
                                        {#if microphone.deviceId === selectedMicrophone}
                                            <span class="chip chip-sm chip-secondary !inline-block">
                                                <span class="chip-label">Active</span><!-- Trad -->
                                            </span>
                                        {:else}
                                            <span class="chip chip-sm chip-neutral !inline-block">
                                                <span class="chip-label">Inactive</span><!-- Trad -->
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <div class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 flex flex-col justify-center items-center">
                    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2">
                        <CamOnIcon height="h-8" width="w-8" />
                        <div class="grow pr-8">Configure your camera <!-- Trad --></div>
                        <button
                            class="btn {!cameraEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                            on:click|stopPropagation|preventDefault={() => (cameraEdit = !cameraEdit)}
                        >
                            {!cameraEdit ? "Edit camera" : "Cancel"}
                        </button>
                    </div>

                    <div class="flex justify-center">
                        <div class="flex items-center justify-center min-h-[294px]">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="border border-solid border-white rounded-lg items-center justify-start m-2 space-x-4 transition-all cursor-pointer overflow-hidden {selectedCamera ==
                                undefined
                                    ? 'bg-white/10'
                                    : 'hover:bg-white/10'} {(cameraEdit && selectedCamera != undefined) ||
                                (!cameraEdit && selectedCamera == undefined)
                                    ? 'flex flex-col'
                                    : 'hidden'}"
                                on:click={() => {
                                    selectCamera(undefined);
                                    cameraEdit = false;
                                }}
                            >
                                {#if selectedCamera == undefined}
                                    <div
                                        class="webrtcsetup flex items-center justify-center h-[200px] aspect-video overflow-hidden bg-contrast"
                                    >
                                        <CamOffIcon />
                                    </div>
                                {/if}
                                <div class="flex py-4 pr-8 pl-4 items-center space-x-4">
                                    <div
                                        class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center"
                                    >
                                        {#if selectedCamera == undefined}
                                            <CheckIcon width="w-4" height="h-4" />
                                        {/if}
                                    </div>
                                    <div class="space-y-1">
                                        <div
                                            class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight"
                                        >
                                            {$LL.camera.disable()}
                                        </div>
                                        {#if selectedCamera == undefined}
                                            <span class="chip chip-sm chip-secondary !inline-block">
                                                <span class="chip-label">Active</span><!-- Trad -->
                                            </span>
                                        {:else}
                                            <span class="chip chip-sm chip-neutral !inline-block">
                                                <span class="chip-label">Not recommended</span><!-- Trad -->
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            {#each $cameraListStore ?? [] as camera (camera.deviceId)}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="border border-solid rounded-lg relative justify-start m-2 space-x-4 transition-all overflow-hidden cursor-pointer {selectedCamera ===
                                    camera.deviceId
                                        ? 'bg-white text-secondary border-none'
                                        : 'border-white hover:bg-white/10'} {(cameraEdit &&
                                        selectedCamera !== camera.deviceId) ||
                                    (!cameraEdit && selectedCamera === camera.deviceId)
                                        ? 'flex flex-col'
                                        : 'hidden'}"
                                    on:click={() => {
                                        selectCamera(camera.deviceId);
                                        cameraEdit = false;
                                    }}
                                >
                                    {#if camera.deviceId === selectedCamera}
                                        {#if selectedCamera != undefined && $localStreamStore.type === "success" && $localStreamStore.stream}
                                            <video
                                                class="myCamVideoSetup flex items-center justify-center h-[200px] aspect-video overflow-hidden"
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
                                    {/if}
                                    <div class="flex py-4 pr-8 pl-4 items-center space-x-4">
                                        <div
                                            class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedCamera ===
                                            camera.deviceId
                                                ? 'bg-secondary border-secondary'
                                                : 'border-white'}"
                                        >
                                            {#if selectedCamera === camera.deviceId}
                                                <CheckIcon width="w-4" height="h-4" />
                                            {/if}
                                        </div>
                                        <div class="space-y-1">
                                            <div
                                                class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight"
                                            >
                                                {StringUtils.normalizeDeviceName(camera.label)}
                                            </div>
                                            {#if camera.deviceId === selectedCamera}
                                                <span class="chip chip-sm chip-secondary !inline-block">
                                                    <span class="chip-label">Active</span><!-- Trad -->
                                                </span>
                                            {:else}
                                                <span class="chip chip-sm chip-neutral !inline-block">
                                                    <span class="chip-label">Inactive</span><!-- Trad -->
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
                    <div class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 flex flex-col justify-center items-center">
                        <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2">
                            <MicOnIcon height="h-8" width="w-8" />
                            <div class="grow pr-8">Your speakers <!-- Trad --></div>
                            <button
                                class="btn {!speakerEdit ? 'btn-secondary' : 'btn-light btn-ghost'}"
                                on:click|stopPropagation|preventDefault={() => (speakerEdit = !speakerEdit)}
                            >
                                {!speakerEdit ? "Edit speaker" : "Cancel"}
                                <!-- Trad -->
                            </button>
                        </div>

                        <div class="flex items-center justify-center">
                            <div class="flex flex-wrap items-center justify-center min-h-[129px]">
                                {#each $speakerListStore as speaker, index (index)}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <div
                                        class="border border-solid rounded-lg relative justify-start items-center m-2 space-x-4 transition-all overflow-hidden cursor-pointer px-8 py-6 {$speakerSelectedStore ===
                                        speaker.deviceId
                                            ? 'bg-white text-secondary border-none'
                                            : 'border-white hover:bg-white/10'} {(speakerEdit &&
                                            $speakerSelectedStore !== speaker.deviceId) ||
                                        (!speakerEdit && $speakerSelectedStore === speaker.deviceId)
                                            ? 'flex'
                                            : 'hidden'}"
                                        on:click={() => {
                                            selectSpeaker(speaker.deviceId);
                                            speakerEdit = false;
                                        }}
                                    >
                                        <div
                                            class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {$speakerSelectedStore ===
                                            speaker.deviceId
                                                ? 'bg-secondary border-secondary'
                                                : 'border-white'}"
                                        >
                                            {#if $speakerSelectedStore === speaker.deviceId}
                                                <CheckIcon width="w-4" height="h-4" />
                                            {/if}
                                        </div>
                                        <div class="space-y-1">
                                            <div
                                                class="text-lg bold max-w-[177px] truncate text-ellipsis overflow-hidden leading-tight"
                                            >
                                                {StringUtils.normalizeDeviceName(speaker.label)}
                                            </div>
                                            {#if speaker.deviceId === $speakerSelectedStore}
                                                <span class="chip chip-sm chip-secondary !inline-block">
                                                    <span class="chip-label">Active</span><!-- Trad -->
                                                </span>
                                            {:else}
                                                <span class="chip chip-sm chip-neutral !inline-block">
                                                    <span class="chip-label">Inactive</span><!-- Trad -->
                                                </span>
                                            {/if}
                                        </div>
                                        {#if speaker.deviceId === $speakerSelectedStore}
                                            <button class="btn btn-secondary">
                                                <!-- TODO HUGO -->
                                                <VolumeIcon />
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
            <section
                class="flex items-center space-x-4 justify-between border border-t border-white pt-8 min-w-[402px]"
            >
                <button type="submit" class="btn btn-light btn-lg btn-ghost min-w-[175px] rounded block">Cancel</button>
                <!-- Trad & TODO ACTION -->
                <button type="submit" class="btn btn-secondary btn-lg min-w-[175px] rounded block">Valider</button>
                <!-- Trad & Changer le label qui est pas ouf -->
            </section>
        </div>
    </section>
</form>
<div class="absolute left-0 top-0 w-screen h-screen bg-cover z-10" style="background-image: url('{bgMap}');" />
<div class="absolute left-0 top-0 w-screen h-screen bg-contrast/80 z-20" style="background-color: '{bgColor}';" />

{#if legalString}
    <section class="terms-and-conditions h-fit absolute z-40 bottom-0 text-center w-full">
        <a style="display: none;" href="traduction">Need for traduction</a>
        <p class="text-white text-xs italic opacity-50">
            {$LL.login.terms({
                links: legalString,
            })}
        </p>
    </section>
{/if}

<style lang="scss">
    .enableCameraScene {
        section.selectWebcamForm {
            min-height: 10vh;
            width: 50vw;
            margin-left: auto;
            margin-right: auto;

            select {
                margin-top: 1vh;
                margin-bottom: 1vh;
            }
        }

        section.action {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin: 0;
            width: 100%;
        }

        h2 {
            margin: 1px;
        }

        section.text-center {
            text-align: center;
        }

        .control-group {
            display: flex;
            flex-direction: row;
            max-height: 60px;
            margin-top: 10px;

            img {
                width: 24px;
                margin-right: 10px;
            }
        }

        .webrtcsetup {
            img.background-img {
                width: 40%;
            }
        }
    }
</style>
