<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";

    let widthWindow: number | undefined;
    function camMountedWidth() {
        widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
        let allCams = (document.getElementsByClassName("all-cameras")[0] as HTMLElement)?.offsetWidth;
        if (widthWindow !== undefined && allCams > widthWindow) {
            let scale = widthWindow / allCams;
            let cameras = document.querySelectorAll(".all-cameras");
            cameras.forEach((camera) => {
                (camera as HTMLElement).style.transform = `scale(${scale})`;
            });
        }
        // stackCameraIfSuperiorToFive();
    }

    function camUnmountedWidth() {
        widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
        let allCams = (document.getElementsByClassName("all-cameras")[0] as HTMLElement)?.offsetWidth;
        if (widthWindow !== undefined && allCams > widthWindow) {
            let scale = widthWindow / allCams;
            let cameras = document.querySelectorAll(".all-cameras");
            cameras.forEach((camera) => {
                (camera as HTMLElement).style.transform = `scale(${scale})`;
            });
        }
        // stackCameraIfSuperiorToFive();
    }

    //Fonction pour stack les caméras

    // function stackCameraIfSuperiorToFive() {
    //     let allCams = document.getElementsByClassName("all-cameras");
    //     if (allCams.length > 4) {
    //         let cameras = document.querySelectorAll(".all-cameras");
    //         cameras.forEach((camera) => {
    //             (camera as HTMLElement).style.flexDirection = "column";
    //         });
    //     }
    // }
</script>

<div class="all-cameras overflow-visible">
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if !highlightedEmbedScreen || $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div id="unique-cam-other">
                    <MediaBox streamable={peer} on:camMounted={camMountedWidth} on:camUnmounted={camUnmountedWidth} />
                </div>
            {/key}
        {/if}
    {/each}
    {#if $myCameraStore}
        <div id="unique-mycam">
            <MyCamera />
        </div>
    {/if}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->

<!-- </aside> -->
<style>
    #unique-mycam,
    #unique-cam-other {
        width: 350px;
        height: 200px;
    }

    .all-cameras {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    @container (max-width: 767px) {
        .mobile-height {
            height: 300px;
        }
        .all-cameras {
            bottom: 0; /* Align to the bottom */
            right: 0; /* Align to the right */
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            align-items: flex-end;
        }

        #unique-cam-other,
        #unique-mycam {
            align-self: flex-end;
            margin-top: auto;
            width: 150px;
            height: 85px;
        }
    }
</style>
