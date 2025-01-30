<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { get, Unsubscriber, writable } from "svelte/store";
    import { z } from "zod";
    import { Streamable, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import ActionBar from "../ActionBar/ActionBar.svelte";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { localStreamStore, localVolumeStore, mediaStreamConstraintsStore } from "../../Stores/MediaStore";
    import microphoneOffImg from "../images/microphone-off.png";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { srcObject } from "./utils";
    import ActivatePictureInPicture from "./PictureInPicture/ActivatePictureInPicture.svelte";
    import StreamableWrapperWidget from "./PictureInPicture/StreamableWrapperWidget.svelte";

    let divElement: HTMLDivElement;
    let myLocalStream: MediaStream | undefined | null;
    let myLocalStreamElement: HTMLVideoElement | undefined;
    const pipWindowStore = writable<Window | undefined>(undefined);
    const highlightedStreamable = writable<Streamable | undefined>(undefined);

    let streamableCollectionStoreSubscriber: Unsubscriber | undefined;
    let activePictureInPictureSubscriber: Unsubscriber | undefined;
    let pipWindowStoreSubscriber: Unsubscriber | undefined;
    let unsubscribeLocalStreamStore: Unsubscriber | undefined;
    let streamablesCollectionStoreSubscriber: Unsubscriber[] = [];

    // create interface for window with documentPictureInPicture
    interface WindowExt extends Window {
        documentPictureInPicture: {
            requestWindow: (options: {
                preferInitialWindowPlacement: boolean;
                height: string;
                width: string;
            }) => Promise<Window>;
        };
    }

    const DocumentPictureInPictureSchema = z.object({
        requestWindow: z
            .function()
            .args(
                z.object({
                    preferInitialWindowPlacement: z.boolean(),
                    height: z.string(),
                    width: z.string(),
                })
            )
            .returns(z.promise(z.instanceof(Window))),
    });

    const WindowExtSchema = z
        .object({
            documentPictureInPicture: DocumentPictureInPictureSchema,
        })
        .passthrough();

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
                // for each streamable in the collection, we will update ratio of the component for the video element
                for (const streamable of value.values()) {
                    try {
                        if (streamable.uniqueId === "localScreenSharingStream") {
                            continue;
                        }
                        streamablesCollectionStoreSubscriber.push(
                            (streamable as VideoPeer).streamStore.subscribe((media) => {
                                const divMailElement = $pipWindowStore?.document.getElementById(
                                    `main-${streamable.uniqueId}`
                                );
                                if (media == undefined) {
                                    if (divMailElement) divMailElement.style.aspectRatio = "";
                                    return;
                                }
                            })
                        );
                    } catch (e) {
                        console.info("Source undefined.", e, streamable.uniqueId);
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
        if (streamableCollectionStoreSubscriber) streamableCollectionStoreSubscriber();
        if (activePictureInPictureSubscriber) activePictureInPictureSubscriber();
        if (unsubscribeLocalStreamStore) unsubscribeLocalStreamStore();

        if ($pipWindowStore) $pipWindowStore.removeEventListener("pagehide", destroyPictureInPictureComponent);
        if ($pipWindowStore) $pipWindowStore.close();
        pipWindowStore.set(undefined);
        streamablesCollectionStoreSubscriber.forEach((subscriber) => subscriber());
        activePictureInPictureStore.set(false);
    }

    function getMyPlayerWokaPicture(): string {
        const gameScene = gameManager.getCurrentGameScene();
        return get(gameScene.CurrentPlayer.pictureStore) as string;
    }

    function hanglerClickVideo(event: CustomEvent) {
        const { streamable } = event.detail;
        if ($highlightedStreamable != undefined && $highlightedStreamable?.uniqueId == streamable.uniqueId) {
            highlightedStreamable.set(undefined);
            return;
        }
        highlightedStreamable.set(streamable);
    }

    function allowPictureInPicture() {
        activePictureInPictureStore.set(true);
    }
    function disagreePictureInPicture() {
        activePictureInPictureStore.set(false);
        destroyPictureInPictureComponent();
    }

    function handlerScreanSharingClick() {
        window.focus();
    }

    function handlerToggleChat() {
        window.focus();
    }

    onMount(() => {
        initiatePictureInPictureBuilder();

        if ($pipWindowStore != undefined) return;
        // We active the picture in picture mode only if we have a streamable in the collection
        if ($streamableCollectionStore.size == 0) return;

        // request permission to use the picture in picture mode
        // TODO: Picture in Picture element is not requested if transitient user acvtivation is not activated
        // see the documentation for more details: https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation
        const windowExtResult = WindowExtSchema.safeParse(window);
        if (!windowExtResult.success) {
            console.info("Picture in Picture is not supported");
            return;
        }

        const options = {
            preferInitialWindowPlacement: true,
            height: `${$streamableCollectionStore.size * 300}`,
            width: "400",
        };

        (window as unknown as WindowExt).documentPictureInPicture
            .requestWindow(options)
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
    class="tw-h-[84%] tw-w-full tw-flex tw-justify-center tw-items-center tw-z-40 tw-py-1"
    style="display: none;"
>
    <ActivatePictureInPicture on:disagree={disagreePictureInPicture} on:allow={allowPictureInPicture} />

    <div
        id="scrolllist-wrapper"
        class="tw-relative tw-flex tw-justify-center tw-items-start tw-w-full tw-h-full tw-overflow-hidden tw-overflow-y-auto"
    >
        <div
            id="mozaic_highlighted-wrapper"
            class="tw-relative tw-w-[98%] tw-h-auto tw-justify-center tw-items-center tw-grid tw-content-center tw-grid-cols-1 sm:tw-grid-cols-2 md:w-grid-cols-3 xl:w-grid-cols-4 tw-gap-3"
            class:!tw-grid-cols-1={$streamableCollectionStore.size === 1 || $highlightedStreamable != undefined}
        >
            {#each [...$streamableCollectionStore] as [uuid, streamable] (uuid)}
                {#if $highlightedStreamable == undefined || $highlightedStreamable.uniqueId == streamable.uniqueId}
                    <StreamableWrapperWidget {streamable} on:click={hanglerClickVideo} />
                {/if}
            {/each}
        </div>
    </div>
    <div
        id="mycamera_nohighlighted-wrapper"
        class="tw-absolute tw-h-auto tw-justify-center tw-items-center tw-right-[5%] tw-bottom-[20%] tw-flex tw-flex-row tw-gap-3"
        style={`width: ${$highlightedStreamable != undefined ? $streamableCollectionStore.size * 20 : 20}%;`}
    >
        {#if $highlightedStreamable != undefined}
            {#each [...$streamableCollectionStore] as [uuid, streamable] (uuid)}
                {#if $highlightedStreamable.uniqueId != streamable.uniqueId}
                    <StreamableWrapperWidget {streamable} isMinified={true} on:click={hanglerClickVideo} />
                {/if}
            {/each}
        {/if}

        <div
            id="mycamera-wrapper"
            class="tw-w-full tw-h-auto tw-max-h-full tw-aspect-video tw-relative tw-flex tw-justify-center tw-items-center tw-z-40 tw-rounded-xl tw-bg-[#373a3e]"
        >
            <img src={getMyPlayerWokaPicture()} class="tw-w-auto tw-h-full tw-max-h-[3rem]" alt="woka user" />
            <div class="voice-meter-my-container tw-justify-end tw-z-[251] tw-pr-2 tw-absolute tw-w-full tw-top-0">
                {#if $mediaStreamConstraintsStore.audio}
                    <SoundMeterWidget volume={$localVolumeStore} classcss="tw-top-0" barColor="blue" />
                {:else}
                    <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-4 tw-w-4" alt="Mute" />
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
    </div>
    <ActionBar
        isPictureInPicture={true}
        on:screenSharingClick={handlerScreanSharingClick}
        on:toggleChat={handlerToggleChat}
    />
</div>

<style lang="scss">
    /* Hide scrollbar for Chrome, Safari and Opera */
    *::-webkit-scrollbar {
        display: none;
    }

    /* Hide scrollbar for IE, Edge and Firefox */
    * {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }
</style>
