<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { z } from "zod";
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

    const debug = Debug("app:PictureInPicture");

    let divElement: HTMLDivElement;
    let parentDivElement: HTMLDivElement;
    let pipWindow: Window | undefined;
    let mapImage: string | undefined = undefined;

    /* eslint-disable svelte/no-dom-manipulating */

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

    function destroyPictureInPictureComponent() {
        if (!parentDivElement) {
            return;
        }
        parentDivElement.append(divElement);

        if (pipWindow) pipWindow.removeEventListener("pagehide", destroyPictureInPictureComponent);
        if (pipWindow) pipWindow.close();
        pipWindow = undefined;
        pipRequested = false;
        activePictureInPictureStore.set(false);
    }

    const unsubscribeIsInRemoteConversation = isInRemoteConversation.subscribe((isTalking) => {
        if (!isTalking) {
            destroyPictureInPictureComponent();
        }
    });

    let pipRequested = false;

    function requestPictureInPicture() {
        debug("Request Picture in Picture mode");

        // We activate the picture in picture mode only if we are in a remote conversation
        if (!$isInRemoteConversation) {
            debug("Request Picture in Picture mode but not in a remote conversation");
            return;
        }

        if (pipWindow !== undefined || pipRequested) return;

        debug("Entering Picture in Picture mode");
        if (!localUserStore.getAllowPictureInPicture()) {
            console.warn("Request Picture in Picture mode but not allowed by the user settings");
            return;
        }

        // request permission to use the picture in picture mode
        // see the documentation for more details: https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation
        const windowExtResult = WindowExtSchema.safeParse(window);
        if (!windowExtResult.success) {
            debug("Picture in Picture is not supported");
            pictureInPictureSupportedStore.set(false);
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
            height: `${pipHeightOption}`,
            width: "400",
        };

        pipRequested = true;

        window.documentPictureInPicture
            .requestWindow(options)
            .then((newPipWindow: Window) => {
                // Picture in picture is possible
                // we store the window to start the picture in picture mode
                // the builder listen the pipWindow and will start the dom building
                pipWindow = newPipWindow;

                // Listen the event when the user wants to close the picture in picture mode
                pipWindow.addEventListener("pagehide", destroyPictureInPictureComponent);

                copySteelSheet(pipWindow);
                pipWindow.document.body.style.display = "flex";
                pipWindow.document.body.style.justifyContent = "center";
                pipWindow.document.body.style.alignItems = "start";
                pipWindow.document.body.style.height = "100vh";
                pipWindow.document.body.style.width = "100%";
                pipWindow.document.createAttribute("data-testid").value = "windowPictureInPicture";
                pipWindow.document.body.append(divElement);

                activePictureInPictureStore.set(true);
            })
            .catch((error: Error) => {
                debug("Picture-in-Picture is not supported", error);
                destroyPictureInPictureComponent();
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

        if (WindowExtSchema.safeParse(window).success === false) {
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

        const unsubscribe = visibilityStore.subscribe((visible) => {
            if (visible) {
                destroyPictureInPictureComponent();
            } else {
                requestPictureInPicture();
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
            />
        {/if}
        <slot inPictureInPicture={$activePictureInPictureStore} />
    </div>
</div>
