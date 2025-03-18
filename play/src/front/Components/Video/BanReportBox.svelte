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
        class="report-ban-btn tw-bg-pop-red tw-flex tw-justify-center tw-h-7 tw-w-7 md:tw-h-5 md:tw-w-5 tw-p-1 tw-min-h-[1px]"
        on:click|stopPropagation={() => openReport(peer)}
    >
        <img alt="Report this user" draggable="false" src={reportImg} class="tw-w-3 tw-h-3 tw-flex" />
    </button>
{/if}
