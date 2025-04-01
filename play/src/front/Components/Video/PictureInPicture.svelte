<script lang="ts">
    import { onDestroy } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import { z } from "zod";
    import { streamablePictureInPictureStore } from "../../Stores/StreamableCollectionStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { pictureInPictureStore } from "./PictureInPicture/PictureInPictureStore";

    let divElement: HTMLDivElement;
    let parentDivElement: HTMLDivElement;
    const pipWindowStore = writable<Window | undefined>(undefined);

    let activePictureInPictureSubscriber: Unsubscriber | undefined;
    let pipWindowStoreSubscriber: Unsubscriber | undefined;

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
        // if we have the window, we start the picture in picture mode builder
        pipWindowStoreSubscriber = pipWindowStore.subscribe((pipWindow) => {
            if (pipWindow == undefined) return;
            copySteelSheet(pipWindow);
            //pipWindow.document.body.style.backgroundColor = "black";
            pipWindow.document.body.style.display = "flex";
            pipWindow.document.body.style.justifyContent = "center";
            pipWindow.document.body.style.alignItems = "start";
            pipWindow.document.body.style.height = "100vh";
            pipWindow.document.body.style.width = "100%";
            pipWindow.document.body.append(divElement);

            setTimeout(() => {
                divElement.style.display = "flex";
            }, 1000);
        });
    }

    function destroyPictureInPictureComponent() {
        if (!parentDivElement) {
            return;
        }
        parentDivElement.append(divElement);

        if (activePictureInPictureSubscriber) activePictureInPictureSubscriber();

        if ($pipWindowStore) $pipWindowStore.removeEventListener("pagehide", destroyPictureInPictureComponent);
        if ($pipWindowStore) $pipWindowStore.close();
        pipWindowStore.set(undefined);
        activePictureInPictureStore.set(false);
    }

    const unsubscribeVisibilityStore = pictureInPictureStore.subscribe((value) => {
        if (!value) {
            destroyPictureInPictureComponent();
        } else {
            initiatePictureInPictureBuilder();

            if ($pipWindowStore != undefined) return;
            // We activate the picture in picture mode only if we have a streamable in the collection
            if ($streamablePictureInPictureStore.size == 0) return;

            // request permission to use the picture in picture mode
            // TODO: Picture in Picture element is not requested if transient user activation is not activated
            // see the documentation for more details: https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation
            const windowExtResult = WindowExtSchema.safeParse(window);
            if (!windowExtResult.success) {
                console.info("Picture in Picture is not supported");
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

            (window as unknown as WindowExt).documentPictureInPicture
                .requestWindow(options)
                .then((pipWindow: Window) => {
                    // Picture in picture is possible
                    // we store the window to start the picture in picture mode
                    // the builder listen the pipWindowStore and will start the dom building
                    pipWindowStore.set(pipWindow);

                    // Listen the event when the user wants to close the picture in picture mode
                    pipWindow.addEventListener("pagehide", destroyPictureInPictureComponent);
                })
                .catch((error: Error) => {
                    console.info("Picture-in-Picture is not supported", error);
                    destroyPictureInPictureComponent();
                    // Maybe we could propose a popup to the user to activate the Picture in Picture mode
                });
        }

        return () => {
            destroyPictureInPictureComponent();
        };
    });

    onDestroy(() => {
        destroyPictureInPictureComponent();
        unsubscribeVisibilityStore();
        if (pipWindowStoreSubscriber) pipWindowStoreSubscriber();
    });
</script>

<div bind:this={parentDivElement} class="h-full w-full">
    <div bind:this={divElement} class="h-full w-full bg-contrast-1100">
        <slot inPictureInPicture={$pictureInPictureStore} />
    </div>
</div>
