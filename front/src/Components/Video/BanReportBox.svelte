<script>
  import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
  import reportImg from "./images/report.svg";
  export let peer;

  function openReport(peer) {
    showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
  }
</script>

<button class="tw-flex tw-mr-0 tw-ml-auto" on:click|stopPropagation={() => openReport(peer)}>
  <img alt="Report this user" draggable="false" on:dragstart|preventDefault={false} src={reportImg} class="tw-w-5 tw-h-5 tw-flex" />
  <span class="noselect tw-flex">Report/Block</span>
</button>