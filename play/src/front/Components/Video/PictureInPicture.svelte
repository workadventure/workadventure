<script lang="ts">
    import type { Snippet } from "svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import Debug from "debug";
    import { isInRemoteConversation, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import {
        activePictureInPictureStore,
        askPictureInPictureActivatingStore,
        pictureInPictureSupportedStore,
    } from "../../Stores/PeerStore";
    import { visibilityStore } from "../../Stores/VisibilityStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import {} from "./PictureInPicture/PictureInPictureWindow";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import {
        hasPictureInPictureContent,
        isDocumentPictureInPictureSupported,
    } from "./PictureInPicture/PictureInPictureAvailabilityPolicy";
    import DesktopCompanion from "./PictureInPicture/DesktopCompanion.svelte";
    import desktopCompanionStyles from "./PictureInPicture/desktopCompanion.css?raw";
    import {
        copyStyleSheets,
        delegateSvelteEvents,
        openDesktopChildWindow,
        type DesktopChildWindow,
    } from "./PictureInPicture/childWindow";

    interface Props {
        children?: Snippet<[{ inPictureInPicture: boolean }]>;
    }

    let { children }: Props = $props();

    const debug = Debug("app:PictureInPicture");

    // In the desktop app, the companion window takes the place of the browser's picture-in-picture: the
    // app decides when it opens and when it shows the meeting (see openCompanionWindow).
    const desktopWindows = window.WAD?.desktop ? window.WAD.windows : undefined;

    let divElement: HTMLDivElement;
    let parentDivElement: HTMLDivElement;
    let pipWindow: Window | undefined;
    let mapImage: string | undefined = $state(undefined);
    let pipRequested = false;
    let unloading = false;
    let stopPictureInPictureEventDelegation: (() => void) | undefined;
    let companion: DesktopChildWindow | undefined;
    let companionProps: { videoHost?: HTMLDivElement } = $state({});

    function destroyPictureInPictureComponent(keepRequest = false) {
        stopPictureInPictureEventDelegation?.();
        stopPictureInPictureEventDelegation = undefined;

        if (!parentDivElement) {
            return;
        }
        // eslint-disable-next-line svelte/no-dom-manipulating
        parentDivElement.append(divElement);

        if (pipWindow) pipWindow.removeEventListener("pagehide", onPictureInPictureWindowPageHide);
        if (pipWindow) pipWindow.close();
        pipWindow = undefined;
        pipRequested = false;
        activePictureInPictureStore.set(false);
        // The window is closed, so the next click on the picture-in-picture button opens it again
        if (!keepRequest) askPictureInPictureActivatingStore.set(false);
        debug("Exiting Picture in Picture mode");
    }

    function onPictureInPictureWindowPageHide() {
        destroyPictureInPictureComponent();
    }

    function onBeforeUnload() {
        // beforeunload fires before the page is hidden, unlike pagehide
        unloading = true;
    }

    function forgetPictureInPictureRequest() {
        askPictureInPictureActivatingStore.set(false);
    }

    const unsubscribeIsInRemoteConversation = isInRemoteConversation.subscribe((isTalking) => {
        if (!isTalking && !desktopWindows) {
            destroyPictureInPictureComponent();
        }
    });

    function requestPictureInPicture() {
        debug("Request Picture in Picture mode");

        // The desktop app opens its companion itself (see the PiP button).
        if (desktopWindows) {
            return;
        }

        if (!hasPictureInPictureContent($isInRemoteConversation, $streamableCollectionStore.size)) {
            debug("Request Picture in Picture mode but no video content is available");
            askPictureInPictureActivatingStore.set(false);
            return;
        }

        if (pipWindow !== undefined || pipRequested) return;

        // Closing the tab or the window hides the page, which would open a picture-in-picture window that outlives it
        if (unloading) {
            debug("Request Picture in Picture mode but the page is unloading");
            return;
        }

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

                copyStyleSheets(pipWindow);
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
                stopPictureInPictureEventDelegation?.();
                stopPictureInPictureEventDelegation = delegateSvelteEvents(pipWindow);

                activePictureInPictureStore.set(true);
                await tick();

                pipWindow.addEventListener("pagehide", onPictureInPictureWindowPageHide);
            })
            .catch((error: Error) => {
                debug("Picture-in-Picture is not supported", error);
                destroyPictureInPictureComponent();
                askPictureInPictureActivatingStore.set(false);
                // Maybe we could propose a popup to the user to activate the Picture in Picture mode
            });
    }

    /**
     * The desktop app asked for its companion: open it as a child window of this page, like the browser's
     * picture-in-picture, so it renders with this page's stores and plays its MediaStreams directly.
     */
    function openCompanionWindow() {
        if (!desktopWindows || companion) return;
        const windows = desktopWindows;
        companion = openDesktopChildWindow(
            "wa-companion",
            DesktopCompanion,
            (ownerDocument) => ({
                windows,
                ownerDocument,
                get videoHost() {
                    return companionProps.videoHost;
                },
                set videoHost(element) {
                    companionProps.videoHost = element;
                },
            }),
            {
                // Closed by the app, or the page goes away: take the videos back first.
                onClose: () => {
                    showMeetingInCompanion(false);
                    companion = undefined;
                },
                styles: desktopCompanionStyles,
            },
        );
    }

    function showMeetingInCompanion(show: boolean) {
        const host = companionProps.videoHost;
        if (show && host) {
            host.append(divElement);
            activePictureInPictureStore.set(true);
        } else if (parentDivElement) {
            // eslint-disable-next-line svelte/no-dom-manipulating
            parentDivElement.append(divElement);
            activePictureInPictureStore.set(false);
        }
    }

    onMount(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            navigator.mediaSession.setActionHandler("enterpictureinpicture", requestPictureInPicture);
        } catch (e: unknown) {
            debug("PictureInPicture enterpictureinpicture handler is not supported", e);
        }

        if (desktopWindows) {
            // The desktop app always has its companion, even where DocumentPictureInPicture is missing.
            pictureInPictureSupportedStore.set(true);
        } else if (!isDocumentPictureInPictureSupported(window)) {
            debug("PictureInPicture is not supported by the browser");
            pictureInPictureSupportedStore.set(false);
        }

        const askPictureInPictureActivatingSubscriber = askPictureInPictureActivatingStore.subscribe((active) => {
            if (desktopWindows) {
                return;
            }
            if (active) {
                requestPictureInPicture();
            } else {
                destroyPictureInPictureComponent();
            }
        });

        const unsubscribe = visibilityStore.subscribe((visible) => {
            if (!desktopWindows && visible) {
                destroyPictureInPictureComponent();
            }
        });

        const unsubscribeMeetingWanted = desktopWindows?.onMeetingWanted(showMeetingInCompanion);
        const unsubscribeOpenWindow = desktopWindows?.onOpen((kind) => {
            if (kind === "companion") openCompanionWindow();
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
        // spec assumes you no longer need it once you're back on the tab). The desktop app decides
        // for its companion (a companion opened by hand stays), so we skip the reset there.
        const onFocus = () => {
            if (desktopWindows) return;
            // The picture-in-picture window takes the focus when it opens, so a click on the picture-in-picture
            // button first focuses this window, which closes the picture-in-picture window. If the button opened it,
            // forget its request only after that click: forgetting it now would make the click open the window again.
            const keepRequest = $askPictureInPictureActivatingStore;
            destroyPictureInPictureComponent(keepRequest);
            if (keepRequest) {
                window.addEventListener("click", forgetPictureInPictureRequest, { once: true });
            }
        };

        window.addEventListener("focus", onFocus);
        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            askPictureInPictureActivatingSubscriber();
            unsubscribe();
            unsubscribeMeetingWanted?.();
            unsubscribeOpenWindow?.();
            companion?.close();
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
            } catch (e: unknown) {
                debug("PictureInPicture enterpictureinpicture handler is not supported", e);
            }
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("beforeunload", onBeforeUnload);
            window.removeEventListener("click", forgetPictureInPictureRequest);
        };
    });

    onDestroy(() => {
        destroyPictureInPictureComponent();
        unsubscribeIsInRemoteConversation();
    });
</script>

<div bind:this={parentDivElement} class="h-full w-full">
    <div bind:this={divElement} class="h-full w-full bg-contrast-1100">
        {#if $activePictureInPictureStore}
            <div
                class="pip-map-background fixed z-0 top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20 bg-black"
                style="background-image: url({mapImage});"
            ></div>
        {/if}
        {@render children?.({ inPictureInPicture: $activePictureInPictureStore })}
    </div>
</div>
