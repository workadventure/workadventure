<script lang="ts">
import {errorStore} from "../../Stores/ErrorStore";

function close(): boolean {
    errorStore.clearMessages();
    return false;
}

</script>

<div class="error-div nes-container is-dark is-rounded" open>
    <p class="nes-text is-error title">Error</p>
    <div class="body">
    {#each $errorStore as error}
    <p>{error}</p>
    {/each}
    </div>
    <div class="button-bar">
        <button class="nes-btn is-error" on:click={close}>Close</button>
    </div>
</div>

<style lang="scss">
    div.error-div {
      pointer-events: auto;
      margin-top: 10vh;
      margin-right: auto;
      margin-left: auto;
      width: max-content;
      max-width: 80vw;

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
