<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";

    export let userUUID: string | undefined;
    let reportMessage: string;
    let hiddenError = true;
    let hiddenUuidError = true;

    function submitReport() {
        hiddenUuidError = false;
        hiddenError = true;

        if (reportMessage === "") {
            hiddenError = false;
        } else {
            if (userUUID === undefined) {
                hiddenUuidError = false;
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
            <p hidden={hiddenUuidError}>{$LL.report.message.error()}</p>
        </section>
        <section>
            <button type="submit" class="btn danger" on:click|preventDefault|stopPropagation={submitReport}
                >{$LL.report.submit()}</button
            >
        </section>
    </form>
</div>
