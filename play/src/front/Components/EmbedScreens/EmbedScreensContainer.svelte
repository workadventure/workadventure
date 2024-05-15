<script lang="ts">
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore, heightCamWrapper } from "../../Stores/EmbedScreensStore";
    import { emoteMenuSubStore } from "../../Stores/EmoteStore";
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
    import MozaicLayout from "./Layouts/MozaicLayout.svelte";
    import "../../style/wa-theme/video-ui.scss";
    import { focusMode, rightMode, lightMode, hideMode } from "../../Stores/ActionsCamStore";

    // DO for the focus mode

    // let isBackgroundActive = false;

    // function changeBackground() {
    //     isBackgroundActive = !isBackgroundActive;
    // }

    // onMount(() => {
    //     window.addEventListener("addFocus", changeBackground);
    //     return () => {
    //         window.removeEventListener("addFocus", changeBackground);
    //     };
    // });

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
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<div
    id="embedScreensContainer"
    class="{$focusMode
        ? `group relative h-full pt-2 @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all`
        : `group relative h-full pt-2 @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all bg-contrast/80`}
        {$rightMode
        ? 'group relative h-full pt-2 @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all flex flex-col'
        : 'group relative h-full pt-2 @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all'}"
    style={$lightMode
        ? "group relative h-full pt-2 @sm/main-layout @xl/main-layout items-center pointer-events-auto transition-all"
        : ""}
>
    <PresentationLayout />
    <!-- {#if $embedScreenLayoutStore === LayoutMode.Presentation}
    {:else} -->
    <!-- <MozaicLayout /> -->
    <!-- {/if} -->

    <!-- <div
        class="group-hover:opacity-100 pointer-events-auto opacity-0 absolute bottom-0 h-4 hover:bg-white/10 w-56 m-auto bg-contrast/80 rounded-full cursor-row-resize transition-all"
    >
        <div
            class="group-hover:opacity-100 opacity-0 absolute bottom-1 left-0 right-0 m-auto h-2 w-48 pointer-events-none"
        >
            <div class="bg-white rounded-lg h-1 w-48" />
        </div>
    </div> -->
</div>

<!-- style={$emoteMenuSubStore ? "padding-top:96px;" : ""} -->
<style>
    @media (max-width: 768px) {
        #embedScreensContainer {
            display: block;
        }
    }
</style>
