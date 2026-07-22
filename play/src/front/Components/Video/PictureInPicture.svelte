<script lang="ts">
    import type { Snippet } from "svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import { on } from "svelte/events";
    import Debug from "debug";
    import { derived, get } from "svelte/store";
    import {
        isInActiveConversationStore,
        isInRemoteConversation,
        myCameraPeerStore,
        streamableCollectionStore,
    } from "../../Stores/StreamableCollectionStore";
    import {
        activePictureInPictureStore,
        askPictureInPictureActivatingStore,
        pictureInPictureSupportedStore,
    } from "../../Stores/PeerStore";
    import { userAwayFromAppStore } from "../../Stores/DesktopVisibilityStore";
    import { gameSceneIsLoadedStore } from "../../Stores/GameSceneStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import {} from "./PictureInPicture/PictureInPictureWindow";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
    import {
        isScreenSharingSupported,
        requestedScreenSharingState,
        startScreenShareWithSource,
    } from "../../Stores/ScreenSharingStore";
    import { recordingStore } from "../../Stores/RecordingStore";
    import {
        currentAnnotationColorStore,
        currentAnnotationToolStore,
        localAnnotationActiveStore,
        type AnnotationTool,
    } from "../../Stores/ScreenAnnotationStore";
    import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";
    import { screenOverlayBridge } from "../../Api/Desktop/ScreenOverlayBridge";
    import { presenterHudBridge } from "../../Api/Desktop/PresenterHudBridge";
    import { presenterEffectsBridge } from "../../Api/Desktop/PresenterEffectsBridge";
    import {
        NativePictureInPictureClient,
        isNativePictureInPictureAvailable,
        shouldOpenNativePictureInPicture,
    } from "./PictureInPicture/NativePictureInPictureClient";
    import {
        hasPictureInPictureContent,
        isDocumentPictureInPictureSupported,
    } from "./PictureInPicture/PictureInPictureAvailabilityPolicy";

    interface Props {
        children?: Snippet<[{ inPictureInPicture: boolean }]>;
    }

    let { children }: Props = $props();

    const debug = Debug("app:PictureInPicture");

    const useNativeDesktopPip = isNativePictureInPictureAvailable();
    let nativeClient: NativePictureInPictureClient | undefined;

    let divElement: HTMLDivElement;
    let parentDivElement: HTMLDivElement;
    let pipWindow: Window | undefined;
    let mapImage: string | undefined = $state(undefined);
    let pipRequested = false;
    let stopPictureInPictureEventDelegation: Array<() => void> = [];

    const delegatedPictureInPictureEvents = [
        "beforeinput",
        "click",
        "change",
        "contextmenu",
        "dblclick",
        "focusin",
        "focusout",
        "input",
        "keydown",
        "keyup",
        "mousedown",
        "mousemove",
        "mouseout",
        "mouseover",
        "mouseup",
        "pointerdown",
        "pointermove",
        "pointerout",
        "pointerover",
        "pointerup",
        "touchend",
        "touchmove",
        "touchstart",
    ];

    // Keep PiP in the current Play renderer instead of opening a second web window.
    // A second renderer would create another websocket/WebRTC session, duplicating presence, audio/video state, and room side effects.
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

    function attachPictureInPictureEventDelegation(pipWindow: Window) {
        detachPictureInPictureEventDelegation();

        // Svelte 5 delegates DOM handlers to the mount document. The PiP DOM is reparented into a
        // separate document, so a no-op svelte/events listener is enough to run Svelte's delegation there.
        stopPictureInPictureEventDelegation = delegatedPictureInPictureEvents.map((eventName) =>
            on(pipWindow.document, eventName, () => {}),
        );
    }

    function detachPictureInPictureEventDelegation() {
        stopPictureInPictureEventDelegation.forEach((stopEventDelegation) => stopEventDelegation());
        stopPictureInPictureEventDelegation = [];
    }

    function destroyPictureInPictureComponent() {
        detachPictureInPictureEventDelegation();

        if (!parentDivElement) {
            return;
        }
        // eslint-disable-next-line svelte/no-dom-manipulating
        parentDivElement.append(divElement);

        if (pipWindow) pipWindow.removeEventListener("pagehide", destroyPictureInPictureComponent);
        if (pipWindow) pipWindow.close();
        pipWindow = undefined;
        pipRequested = false;
        activePictureInPictureStore.set(false);
        askPictureInPictureActivatingStore.set(false);
        debug("Exiting Picture in Picture mode");
    }

    const unsubscribeIsInRemoteConversation = isInRemoteConversation.subscribe((isTalking) => {
        if (!isTalking) {
            if (useNativeDesktopPip && nativeClient?.isActive()) {
                nativeClient.stop();
                activePictureInPictureStore.set(false);
            }
            destroyPictureInPictureComponent();
        }
    });

    function requestPictureInPicture() {
        debug("Request Picture in Picture mode");

        if (useNativeDesktopPip) {
            // Native path: do not open a DocumentPictureInPicture window — the Electron utility
            // window covers this case (and avoids the user-gesture limitation). Keep the request
            // store active while the native PiP is open: the action-bar button uses the same
            // value to turn a second click into an explicit close request.
            //
            // We deliberately skip the hasPictureInPictureContent gate here: it wants either an
            // existing remote video stream or a non-empty streamable collection, but the native
            // PiP is happy to open with placeholder tiles as soon as the user is engaged in an
            // active conversation. Requiring streams caused the first click to be silently dropped
            // whenever the user pressed the button before any peer had published video, so users
            // had to click twice. evaluateNativePipState + shouldOpenNativePictureInPicture already
            // gate on isInActiveConversation, which is the right signal for the native path.
            evaluateNativePipState();
            return;
        }

        if (!hasPictureInPictureContent($isInRemoteConversation, $streamableCollectionStore.size)) {
            debug("Request Picture in Picture mode but no video content is available");
            askPictureInPictureActivatingStore.set(false);
            return;
        }

        if (pipWindow !== undefined || pipRequested) return;

        debug("Entering Picture in Picture mode");
        if (!localUserStore.getAllowPictureInPicture()) {
            console.warn("Request Picture in Picture mode but not allowed by the user settings");
            return;
        }

        if (!isDocumentPictureInPictureSupported(window)) {
            debug("Picture in Picture is not supported");
            pictureInPictureSupportedStore.set(false);
            askPictureInPictureActivatingStore.set(false);
            return;
        }

        let pipHeightOption =
            ($streamableCollectionStore.size > 1 ? $streamableCollectionStore.size - 1 : 1) * 227 + 80 + 78;
        if (window.screen.availHeight && pipHeightOption > window.screen.availHeight) {
            pipHeightOption = window.screen.availHeight;
        }
        const options = {
            preferInitialWindowPlacement: true,
            // 227: the height of a video
            // 80: the height of the action bar
            // 78: the height of the video feedback of the current user
            height: pipHeightOption,
            width: 400,
        };

        pipRequested = true;

        window.documentPictureInPicture
            .requestWindow(options)
            .then(async (newPipWindow: Window) => {
                // Picture in picture is possible
                // we store the window to start the picture in picture mode
                // the builder listen the pipWindow and will start the dom building
                pipWindow = newPipWindow;

                copySteelSheet(pipWindow);
                pipWindow.document.body.style.display = "flex";
                pipWindow.document.body.style.flexDirection = "column";
                pipWindow.document.body.style.justifyContent = "center";
                pipWindow.document.body.style.alignItems = "start";
                pipWindow.document.body.style.height = "100vh";
                pipWindow.document.body.style.width = "100%";
                pipWindow.document.body.setAttribute("data-testid", "windowPictureInPicture");

                // IMPORTANT: append *before* activePictureInPictureStore + tick.
                // documentPictureInPicture 'enter' / LiveKit may run isElementInPiP immediately;
                // if <video> nodes are not under pipWin.document yet, contains(el) is false.
                pipWindow.document.body.append(divElement);
                attachPictureInPictureEventDelegation(pipWindow);

                activePictureInPictureStore.set(true);
                await tick();

                pipWindow.addEventListener("pagehide", destroyPictureInPictureComponent);
            })
            .catch((error: Error) => {
                debug("Picture-in-Picture is not supported", error);
                destroyPictureInPictureComponent();
                askPictureInPictureActivatingStore.set(false);
                // Maybe we could propose a popup to the user to activate the Picture in Picture mode
            });
    }

    onMount(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            navigator.mediaSession.setActionHandler("enterpictureinpicture", requestPictureInPicture);
        } catch (e: unknown) {
            debug("PictureInPicture enterpictureinpicture handler is not supported", e);
        }

        if (useNativeDesktopPip) {
            // The desktop shell always supports PiP via the utility BrowserWindow path; do not
            // signal "unsupported" even if DocumentPictureInPicture is missing in this Chromium.
            pictureInPictureSupportedStore.set(true);
            const screenShareSupported = isScreenSharingSupported();
            const deviceState = derived(
                [requestedMicrophoneState, requestedCameraState, requestedScreenSharingState, recordingStore],
                ([$mic, $cam, $share, $recording]) => ({
                    micEnabled: Boolean($mic),
                    cameraEnabled: Boolean($cam),
                    screenSharing: Boolean($share),
                    canScreenShare: screenShareSupported,
                    recording: Boolean($recording?.isRecording),
                }),
            );
            const annotationState = derived(
                [
                    currentAnnotationToolStore,
                    currentAnnotationColorStore,
                    localAnnotationActiveStore,
                    requestedScreenSharingState,
                ],
                ([$tool, $color, $active, $sharing]) => ({
                    available: Boolean($sharing),
                    active: Boolean($active),
                    tool: $tool,
                    color: $color,
                }),
            );
            nativeClient = new NativePictureInPictureClient({
                streamables: streamableCollectionStore,
                selfBox: myCameraPeerStore,
                deviceState,
                annotationState,
                commandHandlers: {
                    toggleMic: () => {
                        if (get(requestedMicrophoneState)) {
                            requestedMicrophoneState.disableMicrophone();
                        } else {
                            requestedMicrophoneState.enableMicrophone();
                        }
                    },
                    toggleCamera: () => {
                        if (get(requestedCameraState)) {
                            requestedCameraState.disableWebcam();
                        } else {
                            requestedCameraState.enableWebcam();
                        }
                    },
                    toggleScreenshare: () => {
                        if (get(requestedScreenSharingState)) {
                            requestedScreenSharingState.disableScreenSharing();
                        } else {
                            requestedScreenSharingState.enableScreenSharing();
                        }
                    },
                    pickScreenSource: (source) => {
                        // Source was chosen in the PiP utility window. Start the share with this
                        // source directly, bypassing the in-app picker UI so the user never has
                        // to switch focus back to the main window.
                        startScreenShareWithSource({
                            id: source.id,
                            name: source.name,
                            thumbnailURL: "",
                            display_id: source.displayId,
                        });
                    },
                    annotationToggle: () => {
                        localAnnotationActiveStore.set(!get(localAnnotationActiveStore));
                    },
                    annotationSetTool: (tool) => {
                        currentAnnotationToolStore.set(tool as AnnotationTool);
                    },
                    annotationSetColor: (color) => {
                        currentAnnotationColorStore.set(color);
                    },
                    annotationUndo: () => {
                        const target = screenAnnotationManager.localUserId;
                        if (target) {
                            screenAnnotationManager.undoLastLocalElement(target);
                        }
                    },
                    annotationClear: () => {
                        const target = screenAnnotationManager.localUserId;
                        if (target) {
                            screenAnnotationManager.clearAll(target);
                        }
                    },
                    // TODO(presenter-bar): wire chat + reactions. Provide the `chatMessages` dep
                    // (mirror of the proximity ProximityChatRoom messages) and the `sendChat` /
                    // `sendReaction` handlers (ProximityChatRoom.sendMessage + emote), then add the
                    // chat panel + reaction buttons to the PiP renderer. The protocol is already in
                    // place (DesktopPipState.chatMessages + DesktopPipCommand send-chat/send-reaction).
                    // Deferred until the annotation flow is validated on a real desktop build.
                },
            });
            screenOverlayBridge.start();
            presenterHudBridge.start();
            presenterEffectsBridge.start();
        } else if (!isDocumentPictureInPictureSupported(window)) {
            debug("PictureInPicture is not supported by the browser");
            pictureInPictureSupportedStore.set(false);
        }

        const askPictureInPictureActivatingSubscriber = askPictureInPictureActivatingStore.subscribe((active) => {
            if (active) {
                requestPictureInPicture();
            } else if (!useNativeDesktopPip) {
                destroyPictureInPictureComponent();
            } else {
                evaluateNativePipState();
            }
        });

        const unsubscribe = userAwayFromAppStore.subscribe((userAwayFromApp) => {
            if (useNativeDesktopPip) {
                evaluateNativePipState();
                return;
            }
            if (!userAwayFromApp) {
                destroyPictureInPictureComponent();
            }
        });

        const unsubscribeStreamables = streamableCollectionStore.subscribe(() => {
            if (useNativeDesktopPip) {
                evaluateNativePipState();
            }
        });

        const unsubscribeRemote = isInRemoteConversation.subscribe(() => {
            if (useNativeDesktopPip) {
                evaluateNativePipState();
            }
        });

        // Tear down every presenter-facing surface (annotation drawing + screen share) whose
        // audience just vanished. Cascades through the existing bridges:
        //   localAnnotationActiveStore=false → PresenterHudBridge closes annotation bar,
        //     ScreenOverlayBridge drops draw mode.
        //   requestedScreenSharingState=false → ScreenOverlayBridge closes the overlay,
        //     activeScreenShareSourceStore clears → PresenterHudBridge closes meeting bar.
        function closePresenterSurfaces(): void {
            if (get(localAnnotationActiveStore)) {
                localAnnotationActiveStore.set(false);
            }
            if (get(requestedScreenSharingState)) {
                requestedScreenSharingState.disableScreenSharing();
            }
        }

        // Re-evaluate the moment a proximity bubble forms (someone walked into our meeting), even
        // before any media stream actually lands. Lets PiP pop up as soon as a participant joins.
        // On the way OUT (bubble breaks, presenter walks away, meeting ends), also clean up so
        // the HUD bars don't linger on the presenter's screen after the audience has dispersed.
        const unsubscribeActiveConv = isInActiveConversationStore.subscribe((inConversation) => {
            if (!inConversation) {
                closePresenterSurfaces();
            }
            if (useNativeDesktopPip) {
                evaluateNativePipState();
            }
        });

        // A room-to-room transition (portal, teleport, /!command switch) tears the Phaser scene
        // down without necessarily emptying the current proximity bubble in the same tick — the
        // conversation-end subscription above wouldn't catch it. gameSceneIsLoadedStore flips
        // false on every scene shutdown, so we use it as a room-change signal to close the
        // presenter surfaces (they belong to the OLD room's audience). Skip the first
        // false→false initial notification with wasLoaded.
        let wasSceneLoaded = get(gameSceneIsLoadedStore);
        const unsubscribeSceneLoaded = gameSceneIsLoadedStore.subscribe((loaded) => {
            if (wasSceneLoaded && !loaded) {
                closePresenterSurfaces();
            }
            wasSceneLoaded = loaded;
        });

        try {
            const currentScene = gameManager.getCurrentGameScene();
            if (currentScene) {
                const mapImage_ = currentScene.mapFile.properties?.find((p) => p.name === "mapImage")?.value;
                if (mapImage_ != undefined && typeof mapImage_ === "string" && mapImage_ !== "")
                    mapImage = new URL(mapImage_, currentScene.getMapUrl()).toString();
            }
        } catch (e: unknown) {
            console.warn("PictureInPicture => Could not get mapImage from the current game scene", e);
        }

        // Browser PiP is closed as soon as the main window regains focus (the DocumentPictureInPicture
        // spec assumes you no longer need it once you're back on the tab). The native Electron PiP
        // has its own lifecycle policy in shouldOpenNativePictureInPicture — manual-opens must
        // stay visible even when the user clicks back on the main app — so we skip the reset here.
        const onFocus = () => {
            if (useNativeDesktopPip) return;
            destroyPictureInPictureComponent();
        };

        window.addEventListener("focus", onFocus);

        return () => {
            askPictureInPictureActivatingSubscriber();
            unsubscribe();
            unsubscribeStreamables();
            unsubscribeRemote();
            unsubscribeActiveConv();
            unsubscribeSceneLoaded();
            screenOverlayBridge.stop();
            presenterHudBridge.stop();
            presenterEffectsBridge.stop();
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
            } catch (e: unknown) {
                debug("PictureInPicture enterpictureinpicture handler is not supported", e);
            }
            window.removeEventListener("focus", onFocus);
            if (nativeClient) {
                nativeClient.stop();
                nativeClient = undefined;
            }
        };
    });

    function evaluateNativePipState() {
        if (!useNativeDesktopPip || !nativeClient) return;
        const shouldOpen = shouldOpenNativePictureInPicture({
            nativeAvailable: true,
            allowedByUser: localUserStore.getAllowPictureInPicture(),
            inActiveConversation: $isInActiveConversationStore,
            userAwayFromApp: $userAwayFromAppStore,
            userManuallyOpened: $askPictureInPictureActivatingStore,
        });

        if (shouldOpen && !nativeClient.isActive()) {
            nativeClient
                .start(() => {
                    askPictureInPictureActivatingStore.set(false);
                    activePictureInPictureStore.set(false);
                })
                .then((started) => {
                    if (started) {
                        activePictureInPictureStore.set(true);
                    } else {
                        askPictureInPictureActivatingStore.set(false);
                    }
                })
                .catch((error: unknown) => {
                    debug("Native Picture-in-Picture failed to start", error);
                    askPictureInPictureActivatingStore.set(false);
                    activePictureInPictureStore.set(false);
                });
        } else if (!shouldOpen && nativeClient.isActive()) {
            nativeClient.stop();
            activePictureInPictureStore.set(false);
        }
    }

    onDestroy(() => {
        destroyPictureInPictureComponent();
        unsubscribeIsInRemoteConversation();
        if (nativeClient) {
            nativeClient.stop();
            nativeClient = undefined;
        }
    });
</script>

<div bind:this={parentDivElement} class="h-full w-full">
    <div bind:this={divElement} class="h-full w-full bg-contrast-1100">
        {#if $activePictureInPictureStore}
            <div
                class="fixed z-0 top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20 bg-black"
                style="background-image: url({mapImage});"
            ></div>
        {/if}
        {@render children?.({ inPictureInPicture: $activePictureInPictureStore })}
    </div>
</div>
