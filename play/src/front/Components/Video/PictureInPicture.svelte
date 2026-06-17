<script lang="ts">
    import type { Snippet } from "svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import { on } from "svelte/events";
    import Debug from "debug";
    import { isInRemoteConversation, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import {
        activePictureInPictureStore,
        askPictureInPictureActivatingStore,
        pictureInPictureSupportedStore,
    } from "../../Stores/PeerStore";
    import { userAwayFromAppStore } from "../../Stores/DesktopVisibilityStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import {} from "./PictureInPicture/PictureInPictureWindow";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import {
        hasPictureInPictureContent,
        isDocumentPictureInPictureSupported,
    } from "./PictureInPicture/PictureInPictureAvailabilityPolicy";

    interface Props {
        children?: Snippet<[{ inPictureInPicture: boolean }]>;
    }

    let { children }: Props = $props();

    const debug = Debug("app:PictureInPicture");

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
            destroyPictureInPictureComponent();
        }
    });

    function requestPictureInPicture() {
        debug("Request Picture in Picture mode");

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

        if (!isDocumentPictureInPictureSupported(window)) {
            debug("PictureInPicture is not supported by the browser");
            pictureInPictureSupportedStore.set(false);
        }

        const askPictureInPictureActivatingSubscriber = askPictureInPictureActivatingStore.subscribe((active) => {
            if (active) {
                requestPictureInPicture();
            } else {
                destroyPictureInPictureComponent();
            }
        });

        const unsubscribe = userAwayFromAppStore.subscribe((userAwayFromApp) => {
            if (!userAwayFromApp) {
                destroyPictureInPictureComponent();
            }
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

        const onFocus = () => {
            destroyPictureInPictureComponent();
        };

        window.addEventListener("focus", onFocus);

        return () => {
            askPictureInPictureActivatingSubscriber();
            unsubscribe();
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
            } catch (e: unknown) {
                debug("PictureInPicture enterpictureinpicture handler is not supported", e);
            }
            window.removeEventListener("focus", onFocus);
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
                class="fixed z-0 top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20 bg-black"
                style="background-image: url({mapImage});"
            ></div>
        {/if}
        {@render children?.({ inPictureInPicture: $activePictureInPictureStore })}
    </div>
</div>
