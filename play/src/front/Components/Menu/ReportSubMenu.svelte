<script lang="ts">
    import { connectionManager } from "../../Connexion/ConnectionManager";
    import { URL_REPORT_ISSUES } from "../../Enum/EnvironmentVariable";

    function getUrlReportIssues() {
        return connectionManager.currentRoom?.urlReportIssues ?? URL_REPORT_ISSUES;
    }
</script>

<div style="height: calc(100% - 40px);">
    <section class="tw-h-full">
        <iframe title="contact" src={getUrlReportIssues()} class="tw-border-0 tw-w-full tw-h-full" />
    </section>
</div>
