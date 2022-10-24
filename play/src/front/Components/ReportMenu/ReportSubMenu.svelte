<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";

    export let userUUID: string | undefined;
    let reportMessage: string;
    let hiddenError = true;

    function submitReport() {
        if (reportMessage === "") {
            hiddenError = true;
        } else {
            hiddenError = false;
            if (userUUID === undefined) {
                console.error("User UUID is not valid.");
                return;
            }
            gameManager.getCurrentGameScene().connection?.emitReportPlayerMessage(userUUID, reportMessage);
            showReportScreenStore.set(userReportEmpty);
        }
    }
</script>

<div class="tw-flex tw-flex-col tw-text-left tw-p-3">
    <h3 class="blue-title">{$LL.report.title()}</h3>
    <p>{$LL.report.content()}</p>
    <form>
        <section>
            <label class="tw-w-full">
                <span>{$LL.report.message.title()}</span>
                <textarea type="text" class="tw-w-full" bind:value={reportMessage} />
            </label>
            <p hidden={hiddenError}>{$LL.report.message.empty()}</p>
        </section>
        <section>
            <button type="submit" class="btn danger" on:click={submitReport}>{$LL.report.submit()}</button>
        </section>
    </form>
</div>
