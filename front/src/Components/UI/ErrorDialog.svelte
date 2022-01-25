<script lang="ts">
    import { errorStore, hasClosableMessagesInErrorStore } from "../../Stores/ErrorStore";
    import LL from "../../i18n/i18n-svelte";

    function close(): boolean {
        errorStore.clearClosableMessages();
        return false;
    }
</script>

<div class="error-div nes-container is-dark is-rounded" open>
    <p class="nes-text is-error title">{$LL.error.error()}</p>
    <div class="body">
        {#each $errorStore as error}
            <p>{error.message}</p>
        {/each}
    </div>
    {#if $hasClosableMessagesInErrorStore}
        <div class="button-bar">
            <button class="nes-btn is-error" on:click={close}>Close</button>
        </div>
    {/if}
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
