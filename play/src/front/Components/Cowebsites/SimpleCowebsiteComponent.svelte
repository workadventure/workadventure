<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { coWebsiteManager } from "../../Stores/CoWebsiteStore";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";

    export let actualCowebsite: SimpleCoWebsite;
    let url: URL;
    let simpleContainer: HTMLDivElement;
    let iframeId: string;
    let iframeSimpleCowebsite: HTMLIFrameElement;
    let loadIframe: Promise<HTMLIFrameElement>;
    let allowApi: boolean;
    let allowPolicy: string;

    // function createIframe() {
    //     if (!actualCowebsite) {
    //         console.error("actualCowebsite is not defined.");
    //     }

    //     const iframe = document.createElement("iframe");
    //     iframeSimpleCowebsite = iframe;
    //     iframeSimpleCowebsite.src = actualCowebsite.getUrl().toString();
    //     iframeSimpleCowebsite.id = actualCowebsite.getId();

    //     if (allowPolicy) {
    //         iframeSimpleCowebsite.allow = allowPolicy;
    //     }

    //     if (allowApi) {
    //         iframeListener.registerIframe(iframe);
    //     }

    //     iframeSimpleCowebsite.classList.add("pixel");
    //     iframeSimpleCowebsite.style.backgroundColor = "white";

    //     return iframeSimpleCowebsite;
    // }

    // onMount(() => {
    //     console.log("actualCowebsite :", actualCowebsite);
    //     if (!actualCowebsite) {
    //         console.error("actualCowebsite is not defined.");
    //         return;
    //     }
    //     iframeId = coWebsiteManager.generateUniqueId();
    //     iframeSimpleCowebsite = createIframe();

    //     const onloadPromise = new Promise<void>((resolve) => {
    //         iframeSimpleCowebsite.onload = () => {
    //             resolve();
    //         };
    //     });

    //     const onTimeoutPromise = new Promise<void>((resolve) => {
    //         setTimeout(() => resolve(), 2000);
    //     });

    //     loadIframe = Promise.race([onloadPromise, onTimeoutPromise])
    //         .then(() => iframeSimpleCowebsite)
    //         .catch((err) => {
    //             console.error("Error on co-website loading:", err);
    //             throw err;
    //         });
    // });

    // onDestroy(() => {
    //     if (iframeSimpleCowebsite) {
    //         if (allowApi) {
    //             iframeListener.unregisterIframe(iframeSimpleCowebsite);
    //         }
    //         iframeSimpleCowebsite.parentNode?.removeChild(iframeSimpleCowebsite);
    //     }
    // });
</script>

<!-- <div bind:this={simpleContainer} class="w-full height" /> -->
<iframe src={actualCowebsite.getUrl().toString()} frameborder="0" height="100%" width="100%" title="Cowebsite" />

<!-- <script lang="ts">
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { onMount, onDestroy } from "svelte";
    import CancelablePromise from "cancelable-promise";
    import { iframeListener } from "../../Api/IframeListener";


    export let actualCowebsite: SimpleCoWebsite;
    let loadIframe: CancelablePromise<HTMLIFrameElement> | undefined;
    let SimpleCoWebsiteIframe = actualCowebsite.getIframe();
    let allowPolicy: boolean;

    onMount(() => {

        const iframe = document.createElement("iframe");
        iframe.src = url.toString();
        iframe.id = id;

     // Declare the variable allowPolicy
        if (allowPolicy) {
            iframe.allow = allowPolicy;
        }

        if (allowApi) {
            iframeListener.registerIframe(iframe);
        }

        iframe.classList.add("pixel");
        iframe.style.backgroundColor = "white";

        const onloadPromise = new Promise((resolve) => {
            iframe.onload = () => {
                resolve();
            };
        });

        const onTimeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(), 2000);
        });

        const race = Promise.race([onloadPromise, onTimeoutPromise])
            .then(() => {
                resolve(iframe);
            })
            .catch((err) => {
                console.error("Error on co-website loading => ", err);
                reject();
            });


        });


        onDestroy(() => {
            const unload = () => {
                return new Promise((resolve) => {
                    if (iframe) {
                        if (allowApi) {
                            iframeListener.unregisterIframe(iframe);
                        }
                        iframe.parentNode?.removeChild(iframe);
                    }

                    if (loadIframe) {
                        loadIframe.cancel();
                        loadIframe = undefined;
                    }

                    resolve();
                });
        };

        unload().catch((err) => {
            console.error("Error unloading co-website:", err);
        });
    });



            // onDestroy(() => {
            //     race.cancel();
            //     unload().catch((err) => {
            //         console.error("Cannot unload co-website while cancel loading", err);
            //     });
            // });




</script> -->
