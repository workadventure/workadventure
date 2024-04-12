<script lang="ts">
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore, heightCamWrapper } from "../../Stores/EmbedScreensStore";
    import { emoteMenuSubStore } from "../../Stores/EmoteStore";
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
    import MozaicLayout from "./Layouts/MozaicLayout.svelte";
    import "../../style/wa-theme/video-ui.scss";
    import { createEventDispatcher } from "svelte";

    // DO for the focus mode
    const dispatch = createEventDispatcher();

    /*
     * Hugo :
     * Goal : make a resizable cam height
     * Doesn't work properly : buggy */

    // export let y = 20;

    // let expanding: `top` | "bottom" | undefined | null;
    // let start: number | null, initial: { y: number; height: number } | null;p
    // let height = $heightCamWrapper;
    // let delta: number;

    // //     /* eslint-disable @typescript-eslint/no-explicit-any */
    // function startExpand(type: any, event: any): void {
    //     // eslint-disable-line @typescript-eslint/no-unused-vars
    //     expanding = type;
    //     start = event.pageY;
    //     initial = { y, height };
    // }

    // function stopExpand() {
    //     expanding = null;
    //     start = null;
    //     initial = null;
    // }

    // /* eslint-disable @typescript-eslint/no-explicit-any */
    // function expand(event: any) {
    //     // eslint-disable-line @typescript-eslint/no-unused-vars
    //     if (!expanding) return;
    //     if (expanding == "top") {
    //         const delta = start !== null ? start - event.pageY : 0;
    //         console.log(event.pageY);
    //         if (initial) {
    //             y = initial.y - delta;
    //         }
    //         $heightCamWrapper = initial ? initial.height + delta : $heightCamWrapper;
    //         return;
    //     }

    //     if (expanding == "bottom") {
    //         if (start) {
    //             delta = event.pageY - start;
    //         }

    //         console.log(event.pageY);
    //         $heightCamWrapper = (initial?.height ?? 0) + delta;
    //         return;
    //     }
    // }

    // export function focusMode() {
    //     container = document.getElementById("embedScreensContainer") as HTMLDivElement;
    //     container.style.backgroundColor = "bg-contrast/80";
    // }
</script>

<div
    id="embedScreensContainer"
    class="group relative h-full pt-2 @sm/main-layout:pt-20 @xl/main-layout:pt-24 bg-contrast/80 flex justify-center items-center pointer-events-auto transition-all pb-7"
    style={$emoteMenuSubStore ? "padding-top:96px;" : ""}
>
    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
        <!-- <MozaicLayout /> -->
        <PresentationLayout />
    {:else}
        <MozaicLayout />
    {/if}

    <div
        class="group-hover:opacity-100 pointer-events-auto opacity-0 absolute bottom-0 h-4 hover:bg-white/10 w-56 m-auto bg-contrast/80 rounded-full cursor-row-resize transition-all"
    >
        <div
            class="group-hover:opacity-100 opacity-0 absolute bottom-1 left-0 right-0 m-auto h-2 w-48 pointer-events-none"
        >
            <div class="bg-white rounded-lg h-1 w-48" />
        </div>
    </div>
</div>
