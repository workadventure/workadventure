<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { z } from "zod";
    import Debug from "debug";
    import { streamableCollectionStore, streamablePictureInPictureStore } from "../../Stores/StreamableCollectionStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { visibilityStore } from "../../Stores/VisibilityStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import AudioStreamWrapper from "./PictureInPicture/AudioStreamWrapper.svelte";
    import {} from "./PictureInPicture/PictureInPictureWindow";

    const debug = Debug("app:PictureInPicture");

    let divElement: HTMLDivElement;
    let parentDivElement: HTMLDivElement;
    let pipWindow: Window | undefined;

    let activePictureInPictureSubscriber: Unsubscriber | undefined;

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

        if (activePictureInPictureSubscriber) activePictureInPictureSubscriber();

        if (pipWindow) pipWindow.removeEventListener("pagehide", destroyPictureInPictureComponent);
        if (pipWindow) pipWindow.close();
        pipWindow = undefined;
        pipRequested = false;
        activePictureInPictureStore.set(false);
    }

    const unsubscribeStreamablePictureInPictureStore = streamablePictureInPictureStore.subscribe((streamables) => {
        if (streamables.size == 0) {
            destroyPictureInPictureComponent();
        }
    });

    let pipRequested = false;

    function requestPictureInPicture() {
        // We activate the picture in picture mode only if we have a streamable in the collection
        if ($streamablePictureInPictureStore.size == 0) return;

        if (pipWindow !== undefined || pipRequested) return;

        debug("Entering Picture in Picture mode");
        if (!localUserStore.getAllowPictureInPicture()) {
            return;
        }

        // request permission to use the picture in picture mode
        // see the documentation for more details: https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation
        const windowExtResult = WindowExtSchema.safeParse(window);
        if (!windowExtResult.success) {
            debug("Picture in Picture is not supported");
            return;
        }

        const options = {
            preferInitialWindowPlacement: true,
            // 227: the height of a video
            // 80: the height of the action bar
            // 78: the height of the video feedback of the current user
            height: `${$streamablePictureInPictureStore.size * 227 + 80 + 78}`,
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
                //pipWindow.document.body.style.backgroundColor = "black";
                pipWindow.document.body.style.display = "flex";
                pipWindow.document.body.style.justifyContent = "center";
                pipWindow.document.body.style.alignItems = "start";
                pipWindow.document.body.style.height = "100vh";
                pipWindow.document.body.style.width = "100%";
                pipWindow.document.body.append(divElement);

                /*setTimeout(() => {
                    divElement.style.display = "flex";
                }, 1000);*/

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

        const unsubscribe = visibilityStore.subscribe((visible) => {
            if (visible) {
                destroyPictureInPictureComponent();
            } else {
                requestPictureInPicture();
            }
        });

        return () => {
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
        unsubscribeStreamablePictureInPictureStore();
    });
</script>

<div bind:this={parentDivElement} class="h-full w-full">
    <div bind:this={divElement} class="h-full w-full bg-contrast-1100">
        <slot inPictureInPicture={$activePictureInPictureStore} />
    </div>
    {#if $activePictureInPictureStore}
        <!-- Because of a bug in PIP, new content cannot play sound (it does not inherit UserActivation) -->
        <!-- So we need to play audio out of the PIP slot. -->
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            <AudioStreamWrapper {peer} />
        {/each}
    {/if}
</div>
