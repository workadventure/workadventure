<script lang="ts">
import {errorStore} from "../../Stores/ErrorStore";

function close(): boolean {
    errorStore.clearMessages();
    return false;
}

</script>

<dialog class="error-dialog nes-dialog is-dark is-rounded" id="dialog-dark-rounded" open>
    <p class="nes-text is-error title">Error</p>
    <div class="body">
    {#each $errorStore as error}
    <p>{error}</p>
    {/each}
    </div>
    <div class="button-bar">
        <button class="nes-btn is-error" on:click={close}>Close</button>
    </div>
</dialog>

<style lang="scss">
    dialog.error-dialog {
      pointer-events: auto;
      top: 10%;

      .button-bar {
        text-align: center;
      }

      .body {
        max-height: 50vh;
      }

      p {
        font-family: "Press Start 2P";

        &.title {
          text-align: center;
        }
      }
    }
</style>
