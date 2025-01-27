<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { get, Unsubscriber, writable } from "svelte/store";
    import { Streamable, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import ActionBar from "../ActionBar/ActionBar.svelte";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { localStreamStore, localVolumeStore, mediaStreamConstraintsStore } from "../../Stores/MediaStore";
    import microphoneOffImg from "../images/microphone-off.png";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { srcObject } from "./utils";
    import RemoteSoundWidget from "./PictureInPicture/RemoteSoundWidget.svelte";

    let divElement: HTMLDivElement;
    let myLocalStream: MediaStream | undefined | null;
    let myLocalStreamElement: HTMLVideoElement | undefined;
    let pipWindowStore = writable<Window | undefined>(undefined);

    let streamableCollectionStoreSubscriber: Unsubscriber | undefined;
    let activePictureInPictureSubscriber: Unsubscriber | undefined;
    let pipWindowStoreSubscriber: Unsubscriber | undefined;
    let unsubscribeLocalStreamStore: Unsubscriber | undefined;
    let streamablesCollectionStoreSubscriber: Unsubscriber[] = [];

    // create interface for window with documentPictureInPicture
    interface WindowExt extends Window {
        documentPictureInPicture: {
            requestWindow: (options: { preferInitialWindowPlacement: boolean }) => Promise<Window>;
        };
    }

    function copySteelSheet(pipWindow: Window) {
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
                const style = document.createElement("style");

                style.textContent = cssRules;
                pipWindow.document.head.appendChild(style);
            } catch (e) {
                console.error("Could not copy stylesheet: ", e);
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = styleSheet.type;
                link.media = styleSheet.media.mediaText;
                link.href = styleSheet.href || "";
                pipWindow.document.head.appendChild(link);
            }
        });
    }

    function initiatePictureInPictureBuilder() {
        // subscribe to the picture in picture window
        // if we ha ve the window, we start the picture in picture mode builser
        pipWindowStoreSubscriber = pipWindowStore.subscribe((pipWindow) => {
            if (pipWindow == undefined) return;
            copySteelSheet(pipWindow);
            pipWindow.document.body.style.backgroundColor = "black";
            pipWindow.document.body.style.display = "flex";
            pipWindow.document.body.style.justifyContent = "center";
            pipWindow.document.body.style.alignItems = "start";
            pipWindow.document.body.style.height = "100vh";
            pipWindow.document.body.style.width = "100%";
            pipWindow.document.body.append(divElement);

            setTimeout(() => {
                divElement.style.display = "flex";
            }, 1000);

            // start the subscriber to the streamable collection
            streamableCollectionStoreSubscriber = streamableCollectionStore.subscribe((value) => {
                if (value.size == 0) {
                    destroyPictureInPictureComponent();
                    return;
                }
                activePictureInPictureStore.set(true);
                // for each streamable in the collection, we will add the stream to the video element
                for (const streamable of value.values()) {
                    // create video for element
                    try {
                        streamablesCollectionStoreSubscriber.push(
                            (streamable as VideoPeer).streamStore.subscribe((media) => {
                                setTimeout(() => {
                                    const videoElementCreated = $pipWindowStore?.document.getElementById(
                                        `video-${streamable.uniqueId}`
                                    ) as HTMLVideoElement | undefined;
                                    if (videoElementCreated) videoElementCreated.remove();
                                    const divMailElement = $pipWindowStore?.document.getElementById(
                                        `main-${streamable.uniqueId}`
                                    );
                                    if (media == undefined) {
                                        if (divMailElement) divMailElement.style.aspectRatio = "";
                                        return;
                                    }

                                    const ratio = media.getVideoTracks()[0]?.getSettings().aspectRatio;
                                    if (divMailElement) divMailElement.style.aspectRatio = `${ratio}`;

                                    const videoElement = document.createElement("video");
                                    videoElement.id = `video-${streamable.uniqueId}`;
                                    videoElement.srcObject = media;
                                    videoElement.autoplay = true;
                                    videoElement.muted = true;
                                    videoElement.style.width = "100%";
                                    videoElement.style.height = "auto";
                                    videoElement.style.maxHeight = "100%";
                                    videoElement.style.objectFit = "cover";
                                    videoElement.style.borderRadius = "16px";
                                    videoElement.style.position = "absolute";
                                    videoElement.style.top = "0";
                                    videoElement.style.left = "0";
                                    videoElement.style.right = "0";
                                    videoElement.style.bottom = "0";
                                    videoElement.style.backgroundColor = "#373a3e";
                                    videoElement.style.zIndex = "40";
                                    videoElement.style.aspectRatio = `${ratio}`;

                                    if (divMailElement) divMailElement.appendChild(videoElement);
                                }, 1000);
                            })
                        );
                    } catch (e) {
                        console.info(
                            "Source undefined. The element streamable will not attach to the video element",
                            e,
                            streamable.uniqueId
                        );
                    }
                }
            });

            // start the subscrbtion to active my camera
            unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
                if (value.type === "success") {
                    if (value.stream == undefined) return;
                    myLocalStream = value.stream;
                    // TODO: remove this hack
                    setTimeout(() => {
                        if (myLocalStreamElement)
                            myLocalStreamElement.style.aspectRatio = `${
                                value.stream?.getVideoTracks()[0]?.getSettings().aspectRatio
                            }`;
                    }, 100);
                } else {
                    myLocalStream = null;
                }
            });
        });
    }

    function destroyPictureInPictureComponent() {
        if ($pipWindowStore) $pipWindowStore.removeEventListener("pagehide", destroyPictureInPictureComponent);
        if ($pipWindowStore) $pipWindowStore.close();
        pipWindowStore.set(undefined);
        if (streamableCollectionStoreSubscriber) streamableCollectionStoreSubscriber();
        if (activePictureInPictureSubscriber) activePictureInPictureSubscriber();
        if (unsubscribeLocalStreamStore) unsubscribeLocalStreamStore();
        streamablesCollectionStoreSubscriber.forEach((subscriber) => subscriber());
        activePictureInPictureStore.set(false);
    }

    function getPlayerWokaPicture(streamable: Streamable): string {
        const gameScene = gameManager.getCurrentGameScene();
        const playerWokaPictureStore = [...gameScene.MapPlayersByKey].find(
            ([, player]) => player.userUuid === (streamable as VideoPeer).player.userUuid
        )?.[1].pictureStore;
        return playerWokaPictureStore ? (get(playerWokaPictureStore) as string) : "";
    }

    function getMyPlayerWokaPicture(): string {
        const gameScene = gameManager.getCurrentGameScene();
        return get(gameScene.CurrentPlayer.pictureStore) as string;
    }

    onMount(() => {
        initiatePictureInPictureBuilder();

        if ($pipWindowStore != undefined) return;
        // We active the picture in picture mode only if we have a streamable in the collection
        if ($streamableCollectionStore.size == 0) return;

        // request permission to use the picture in picture mode
        // TODO: Picture in Picture element is not requested if transitient user acvtivation is not activated
        // see the documentation for more details: https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation
        (window as unknown as WindowExt).documentPictureInPicture
            .requestWindow({
                preferInitialWindowPlacement: true,
            })
            .then((pipWindow: Window) => {
                // Picture in picture is possible
                // we store the window to start the picture in picture mode
                // the builder listen the pipWindowStore and will start the dom building
                pipWindowStore.set(pipWindow);

                // Listen the event whent the user whant to close the picture in picture mode
                pipWindow.addEventListener("pagehide", destroyPictureInPictureComponent);
            })
            .catch((error: Error) => {
                console.info("Picture-in-Picture is not supported", error);
                destroyPictureInPictureComponent();
                // Maybe we could propose a popup to the user to activare the Picture in Picture mode
            });
    });

    onDestroy(() => {
        destroyPictureInPictureComponent();
        if (pipWindowStoreSubscriber) pipWindowStoreSubscriber();
    });
</script>

<div
    bind:this={divElement}
    class="tw-h-[84%] tw-w-full tw-flex tw-justify-center tw-items-center tw-z-40 tw-py-8"
    style="display: none;"
>
    <div
        id="wrapper"
        class="tw-relative tw-w-[98%] tw-h-full tw-justify-center tw-items-center tw-grid tw-content-center tw-grid-cols-1 sm:tw-grid-cols-2 md:w-grid-cols-3 xl:w-grid-cols-4 tw-gap-3"
        class:!tw-grid-cols-1={$streamableCollectionStore.size === 1}
    >
        {#each [...$streamableCollectionStore] as [uuid, streamable] (uuid)}
            <div
                id={`main-${streamable.uniqueId}`}
                class="tw-w-full tw-h-auto tw-max-h-full tw-aspect-video tw-relative tw-flex tw-justify-center tw-items-center tw-z-40 tw-rounded-xl tw-bg-[#373a3e]"
            >
                <img
                    src={getPlayerWokaPicture(streamable)}
                    class="tw-w-auto tw-h-full tw-max-h-[8rem]"
                    alt="woka user"
                />
                <RemoteSoundWidget {streamable} />
            </div>
        {/each}
    </div>
    <div
        id="mycamera-wrapper"
        class="tw-absolute tw-h-auto tw-w-1/5 tw-justify-center tw-items-center tw-right-[5%] tw-bottom-[20%] tw-flex tw-bg-[#373a3e] tw-z-40 tw-rounded-xl tw-aspect-video"
    >
        <img src={getMyPlayerWokaPicture()} class="tw-w-auto tw-h-full tw-max-h-[4rem]" alt="woka user" />
        <div class="voice-meter-my-container tw-justify-end tw-z-[251] tw-pr-2 tw-absolute tw-w-full tw-top-0">
            {#if $mediaStreamConstraintsStore.audio}
                <SoundMeterWidget volume={$localVolumeStore} classcss="tw-top-0" barColor="blue" />
            {:else}
                <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
            {/if}
        </div>
        {#if myLocalStream != undefined}
            <video
                bind:this={myLocalStreamElement}
                id="my-video"
                class="tw-h-full tw-w-full tw-rounded-lg tw-object-cover tw-absolute"
                style="-webkit-transform: scaleX(-1);transform: scaleX(-1);"
                use:srcObject={myLocalStream}
                autoplay
                muted
                playsinline
            />
        {/if}
    </div>
    <ActionBar isPictureInPicture={true} />
</div>
