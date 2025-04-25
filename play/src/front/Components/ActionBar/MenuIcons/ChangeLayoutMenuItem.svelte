<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { LayoutMode } from "../../../WebRtc/LayoutManager";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    //import LL from "../../../workadventure/play/src/i18n/i18n-svelte";
    import { embedScreenLayoutStore } from "../../../Stores/EmbedScreensStore";

    // Still needed ?
    function switchLayoutMode() {
        // if ($embedScreenLayoutStore === LayoutMode.Presentation) {
        //     $embedScreenLayoutStore = LayoutMode.VideoChat;
        // } else {
        //     $embedScreenLayoutStore = LayoutMode.Presentation;
        // }
    }
</script>

<ActionBarButton
    on:click={() => {
        analyticsClient.layoutPresentChange();
        switchLayoutMode();
    }}
    classList="group/btn-layout"
    disabledHelp={$openedMenuStore !== undefined}
    dataTestId="changeLayout"
>
    <!--            tooltipTitle={$LL.actionbar.help.changeLayout.title()}
                tooltipDesc={$LL.actionbar.help.changeLayout.desc()} -->

    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-arrows-minimize"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 9l4 0l0 -4" />
            <path d="M3 3l6 6" />
            <path d="M5 15l4 0l0 4" />
            <path d="M3 21l6 -6" />
            <path d="M19 9l-4 0l0 -4" />
            <path d="M15 9l6 -6" />
            <path d="M19 15l-4 0l0 4" />
            <path d="M15 15l6 6" />
        </svg>
    {:else}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-arrows-maximize"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M16 4l4 0l0 4" />
            <path d="M14 10l6 -6" />
            <path d="M8 20l-4 0l0 -4" />
            <path d="M4 20l6 -6" />
            <path d="M16 20l4 0l0 -4" />
            <path d="M14 14l6 6" />
            <path d="M8 4l-4 0l0 4" />
            <path d="M4 4l6 6" />
        </svg>
    {/if}
</ActionBarButton>
