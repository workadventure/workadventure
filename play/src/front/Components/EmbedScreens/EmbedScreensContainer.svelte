<script lang="ts">
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { emoteMenuSubStore } from "../../Stores/EmoteStore";
    import PresentationLayout from "./Layouts/PresentationLayout.svelte";
    import MozaicLayout from "./Layouts/MozaicLayout.svelte";
    import "../../style/wa-theme/video-ui.scss";

    /**
     * Hugo :
     * Goal : make a resizable cam height
     * Doesn't work properly : buggy */
    /*
    export let y = 20

    let expanding = null
    let start = null, initial = null
    let height = get(heightCamWrapper);

    function startExpand(type, event) {
        expanding = type
        start = event.pageY
        initial = { y, height }
    }

    function stopExpand() {
        expanding = null
        start = null
        initial = null
    }

    function expand(event) {
        if (!expanding) return
        if (expanding == 'top') {
            const delta = start - event.pageY
            console.log(event.pageY);
            y = initial.y - delta
            $heightCamWrapper = initial.height + delta
            return
        }

        if (expanding == 'bottom') {
            const delta = event.pageY - start
            console.log(event.pageY);
            $heightCamWrapper = initial.height + delta
            return
        }
    }
     */
</script>

<div
    id="embedScreensContainer"
    class="group relative h-full pt-24 flex justify-center items-center pointer-events-auto transition-all pb-7"
    style={$emoteMenuSubStore ? "padding-top:96px;" : ""}
>
    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
        <PresentationLayout />
    {:else}
        <MozaicLayout />
    {/if}
    <!--
    <div class="group-hover:opacity-100 pointer-events-auto opacity-0 absolute bottom-0 h-4 hover:bg-white/10 w-56 m-auto bg-contrast/80 rounded-full cursor-row-resize transition-all" on:mousedown={startExpand.bind(this, 'bottom')} on:mousemove={expand}>
        <div class="group-hover:opacity-100 opacity-0 absolute bottom-1 left-0 right-0 m-auto h-2 w-48 pointer-events-none">
            <div class="bg-white rounded-lg h-1 w-48"></div>
        </div>
    </div>
    -->
    <!-- TODO HUGO -->
</div>

<style lang="scss">
</style>
