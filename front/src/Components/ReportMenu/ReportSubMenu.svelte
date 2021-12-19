<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { translator } from "../../Translator/Translator";

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

<div class="report-container-main">
    <h3>{translator._("report.title")}</h3>
    <p>{translator._("report.message")}</p>
    <form>
        <section>
            <label>
                <span>{translator._("report.message.title")}</span>
                <textarea type="text" class="nes-textarea" bind:value={reportMessage} />
            </label>
            <p hidden={hiddenError}>{translator._("report.message.empty")}</p>
        </section>
        <section>
            <button type="submit" class="nes-btn is-error" on:click={submitReport}
                >{translator._("report.submit")}</button
            >
        </section>
    </form>
</div>

<style lang="scss">
    div.report-container-main {
        text-align: center;

        textarea {
            height: clamp(100px, 15vh, 300px);
        }
    }

    @media only screen and (max-height: 630px) {
        div.report-container-main textarea {
            height: 50px;
        }
    }
</style>
