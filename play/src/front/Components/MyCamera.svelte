<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        cameraEnergySavingStore,
        localVolumeStore,
        mediaStreamConstraintsStore,
        requestedCameraState,
        silentStore,
        localStreamStore,
    } from "../Stores/MediaStore";
    import { LL } from "../../i18n/i18n-svelte";
    import { inExternalServiceStore } from "../Stores/MyMediaStore";
    import { currentPlayerWokaStore } from "../Stores/CurrentPlayerWokaStore";
    import SoundMeterWidget from "./SoundMeterWidget.svelte";
    import { srcObject } from "./Video/utils";
    import loaderImg from "./images/loader.svg";

    import MicOffIcon from "./Icons/MicOffIcon.svelte";
    import UserName from "./Video/UserName.svelte";

    let stream: MediaStream | undefined;
    // let userName = gameManager.getPlayerName();
    // let backgroundColor = Color.getColorByString(userName ?? "default");
    // let textColor = Color.getTextColorByBackgroundColor(backgroundColor);

    // Voir pour assigner un userId a un partage d'écran et ensuite si il est egale ai user id j'affiche l'icone

    // $: screenSharingRequesterStoreValue = $screenSharingRequesterStore;
    // $: requestedScreenSharingStateValue = $requestedScreenSharingState;

    // const unsubscribeScreenSharingRequesterStore = screenSharingRequesterStore.subscribe((value) => {
    //     $screenSharingRequesterStore = value;
    // });

    // const unsubscribeRequestedScreenSharingState = requestedScreenSharingState.subscribe((value) => {
    //     $requestedScreenSharingState = value;
    // });

    // $: $requestedScreenSharingState = getIdOrNameIfScreenSharing();

    // function getIdOrNameIfScreenSharing() {
    //     if ($requestedScreenSharingState) {
    //         return gameManager.getPlayerName();
    //     }
    //     return false;
    // }
    //     if ($screenSharingRequesterStore === userId) {
    //         return true;
    //     }
    //     return false;

    // if ($screenSharingRequesterStore) {
    //     return $gameManager.getPlayerName();
    // }
    // return gameManager.getPlayerName();

    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;
        } else {
            stream = undefined;
        }
    });

    let cameraContainer: HTMLDivElement;
    export let small = false;

    onDestroy(() => {
        unsubscribeLocalStreamStore();
    });

    onMount(() => {
        cameraContainer.addEventListener("transitionend", () => {
            if (cameraContainer.classList.contains("hide")) {
                cameraContainer.style.visibility = "hidden";
            }
        });

        cameraContainer.addEventListener("transitionstart", () => {
            if (!cameraContainer.classList.contains("hide")) {
                cameraContainer.style.visibility = "visible";
            }
        });
    });
</script>

<div class="transition-all relative h-full w-full flex justify-start aspect-video m-auto" bind:this={cameraContainer}>
    {#if !$cameraEnergySavingStore && !$silentStore}
        <div class="z-[251] absolute right-3 top-1 aspect-ratio p-2 {small ? 'hidden' : ''}">
            {#if $mediaStreamConstraintsStore.audio}
                <SoundMeterWidget volume={$localVolumeStore} barColor="white" />
            {:else}
                <MicOffIcon />
            {/if}
        </div>
    {/if}
    <!--If we have a video to display-->
    {#if !$silentStore}
        {#if $localStreamStore.type === "success" && !$inExternalServiceStore}
            {#if $requestedCameraState && $mediaStreamConstraintsStore.video}
                <UserName
                    picture={currentPlayerWokaStore}
                    name={$LL.camera.my.nameTag()}
                    isPlayingAudio={$mediaStreamConstraintsStore.audio !== false}
                    position="absolute bottom-4 left-4"
                />

                <div
                    class="aspect-video w-full absolute top-0 left-0 overflow-hidden z-20 rounded-lg transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur{$mediaStreamConstraintsStore.audio
                        ? 'border-6 border-solid border-color '
                        : 'media-box-micropohone-off'}"
                    style="background-image: url({loaderImg})"
                >
                    <div
                        class="text-white/50 text-xxs absolute w-full h-6 left-0 text-center top-0 -bottom-20 m-auto z-10"
                    >
                        {$LL.camera.my.loading()}
                    </div>
                    <video
                        class="w-full rounded-lg md:object-cover relative z-20"
                        class:object-contain={stream}
                        style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                        use:srcObject={stream}
                        autoplay
                        muted
                        playsinline
                    />
                </div>
                <!-- If we do not have a video to display-->
            {:else if !$requestedCameraState && !$cameraEnergySavingStore}
                <div class="w-full rounded-lg px-3 flex flex-row items-center bg-contrast/80 backdrop-blur h-12">
                    <div class="grow">
                        <UserName
                            picture={currentPlayerWokaStore}
                            name={$LL.camera.my.nameTag()}
                            isPlayingAudio={$mediaStreamConstraintsStore.audio !== false}
                            position="absolute bottom-1.5 left-4"
                        />
                    </div>
                </div>
            {/if}
        {/if}
    {/if}
</div>

<style>
    .border-color {
        border-color: #4156f6;
    }

    /*.background-color-speaker {
        background-color: #4156f6;
    }*/

    @container (max-width: 767px) {
        .responsive-dimension {
            scale: 0.7;
            position: absolute;
            top: 0;
            left: 0;
        }
    }
</style>
