<script lang="ts">
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import type { VideoBox } from "../../Space/Space";
    import reportImg from "./images/report.svg";
    export let videoBox: VideoBox;

    function openReport(videoBox: VideoBox) {
        const extendedSpaceUser = videoBox.spaceUser;
        if (!extendedSpaceUser) {
            console.error("openReport : peer has no extendedSpaceUser");
            return;
        }
        showReportScreenStore.set({
            userUuid: extendedSpaceUser.uuid,
            userName: extendedSpaceUser.name,
        });
    }
</script>

<button
    class="report-ban-btn bg-pop-red flex justify-center h-7 w-7 md:h-5 md:w-5 p-1 min-h-[1px]"
    on:click|stopPropagation={() => openReport(videoBox)}
>
    <img alt="Report this user" draggable="false" src={reportImg} class="w-3 h-3 flex" />
</button>
