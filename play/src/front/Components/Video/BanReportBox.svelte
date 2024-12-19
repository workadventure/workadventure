<script>
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import reportImg from "./images/report.svg";

    export let peer;

    function openReport(peer) {
        showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
    }
</script>

<button
    class="report-ban-btn bg-pop-red flex justify-center h-7 w-7 md:h-5 md:w-5 p-1 min-h-[1px]"
    on:click|stopPropagation={() => openReport(peer)}
>
    <img alt="Report this user" draggable="false" src={reportImg} class="w-3 h-3 flex" />
</button>
