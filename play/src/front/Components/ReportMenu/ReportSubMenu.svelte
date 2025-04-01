<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { LL } from "../../../i18n/i18n-svelte";
    import TextArea from "../Input/TextArea.svelte";

    export let userUUID: string | undefined;
    export let userName: string | undefined;

    let reportMessage: string;
    let hiddenError = true;
    let hiddenUuidError = true;

    function submitReport() {
        hiddenUuidError = true;
        hiddenError = true;

        if (reportMessage == undefined || reportMessage === "") {
            hiddenError = false;
        } else {
            if (userUUID === undefined) {
                hiddenUuidError = false;
                console.error("User UUID is not valid.");
                return;
            }
            reportMessage = `
                -- Date: ${new Date().getTime()} -- \r
                -- Reporter: ${gameManager.getPlayerName()} -- \r
                -- Reported: ${userName} -- \n\r
                ${reportMessage}
            `;
            gameManager.getCurrentGameScene().connection?.emitReportPlayerMessage(userUUID, reportMessage);
            showReportScreenStore.set(userReportEmpty);
        }
    }
</script>

<div class="flex flex-col text-left p-3">
    <h3 class="blue-title">{$LL.report.title()}</h3>
    <p>{$LL.report.content()}</p>
    <form>
        <section class="mb-0 pb-0">
            <TextArea label={$LL.report.message.title()} bind:value={reportMessage} onKeyPress={() => {}} />
            {#if !hiddenError}
                <p class="text-pop-red mb-0 pb-0">{$LL.report.message.empty()}</p>
            {/if}
            {#if !hiddenUuidError}
                <p class="text-pop-red mb-0 pb-0">{$LL.report.message.error()}</p>
            {/if}
        </section>
        <section>
            <button type="submit" class="btn btn-danger w-full" on:click|preventDefault|stopPropagation={submitReport}
                >{$LL.report.submit()}</button
            >
        </section>
    </form>
</div>
