<script lang="ts">
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { REPORT_ISSUES_URL } from "../../Enum/EnvironmentVariable";

    function getReportIssuesUrl() {
        return connectionManager.currentRoom?.reportIssuesUrl ?? REPORT_ISSUES_URL;
    }
</script>

<div style="height: calc(100% - 40px);">
    <section class="tw-h-full">
        <iframe title="contact" src={getReportIssuesUrl()} class="tw-border-0 tw-w-full tw-h-full" />
    </section>
</div>
