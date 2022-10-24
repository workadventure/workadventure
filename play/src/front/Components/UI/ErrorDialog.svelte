<script lang="ts">
    import { errorStore, hasClosableMessagesInErrorStore } from "../../Stores/ErrorStore";
    import LL from "../../../i18n/i18n-svelte";

    function close(): boolean {
        errorStore.clearClosableMessages();
        return false;
    }
</script>

<div class="error-div is-dark is-rounded tw-flex tw-flex-col tw-items-center tw-justify-center" open>
    <p class="is-error title">{$LL.error.error()}</p>
    <div class="body">
        {#each $errorStore as error}
            <p>{error.message}</p>
        {/each}
    </div>
    {#if $hasClosableMessagesInErrorStore}
        <div class="button-bar">
            <button class="light" on:click={close}>Close</button>
        </div>
    {/if}
</div>

<style lang="scss">
    div.error-div {
        pointer-events: auto;
        margin-top: 4%;
        margin-right: auto;
        margin-left: auto;
        left: 0;
        right: 0;
        position: absolute;
        width: max-content;
        max-width: 80vw;
        z-index: 230;
        height: auto !important;
        background-clip: padding-box;

        .button-bar {
            text-align: center;
        }

        .body {
            max-height: 50vh;
        }

        p {
            &.title {
                text-align: center;
            }
        }
    }
</style>
