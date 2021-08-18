<script lang="ts">
    import {showReportScreenStore} from "../../Stores/ShowReportScreenStore";
    import {gameManager} from "../../Phaser/Game/GameManager";

    export let userUUID: string | undefined;
    let reportMessage: string;
    let hiddenError = true;

    function submitReport() {
        if (reportMessage === '') {
            hiddenError = true;
        } else {
            hiddenError = false;
            if( userUUID === undefined) {
                throw ('User UUID is not valid.');
            }
            gameManager.getCurrentGameScene().connection?.emitReportPlayerMessage(userUUID, reportMessage);
            showReportScreenStore.set(null)
        }
    }
</script>

<div class="report-container-main">
    <h3>Report</h3>
    <p>Send a report message to the administrators of this room. They may later ban this user.</p>
    <form>
        <section>
            <label>
                <span>Your message: </span>
                <textarea type="text" class="nes-textarea" bind:value={reportMessage}></textarea>
            </label>
            <p hidden="{hiddenError}">Report message cannot to be empty.</p>
        </section>
        <section>
            <button type="submit" class="nes-btn is-error" on:click={submitReport}>Report this user</button>
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