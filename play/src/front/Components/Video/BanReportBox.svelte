<script lang="ts">
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import reportImg from "./images/report.svg";

    export let peer: Streamable;

    async function openReport(peer: Streamable) {
        if (peer instanceof VideoPeer || peer instanceof ScreenSharingPeer) {
            showReportScreenStore.set({
                userUuid: (await peer.getExtendedSpaceUser()).uuid,
                userName: peer.player.name,
            });
        }
    }
</script>

{#if peer instanceof VideoPeer || peer instanceof ScreenSharingPeer}
    <button
        class="report-ban-btn bg-pop-red flex justify-center h-7 w-7 md:h-5 md:w-5 p-1 min-h-[1px]"
        on:click|stopPropagation={() => openReport(peer)}
    >
        <img alt="Report this user" draggable="false" src={reportImg} class="w-3 h-3 flex" />
    </button>
{/if}
