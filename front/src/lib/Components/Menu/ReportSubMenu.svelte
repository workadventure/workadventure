<script lang="ts">
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { REPORT_ISSUES_URL } from "../../Enum/EnvironmentVariable";

    function getReportIssuesUrl() {
        return connectionManager.currentRoom?.reportIssuesUrl ?? REPORT_ISSUES_URL;
    }
</script>

<div style="height: calc(100% - 40px);">
    <section class="h-full">
        <iframe title="contact" src={getReportIssuesUrl()} class="border-0 w-full h-full" />
    </section>
</div>
