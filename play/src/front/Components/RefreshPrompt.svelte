<script lang="ts">
    import { onMount } from "svelte";
    import { refreshPromptStore } from "../Stores/RefreshPromptStore";
    import { LL } from "../../i18n/i18n-svelte";

    let timeToRefreshSeconds = $refreshPromptStore?.timeToRefresh ?? 30;

    onMount(() => {
        setInterval(() => {
            if (timeToRefreshSeconds === 0) {
                window.location.reload();
            }
            timeToRefreshSeconds--;
        }, 1000);
    });
</script>

<div class="tw-grid tw-place-items-center tw-h-screen refresh">
    <div class="tw-px-10 tw-py-80 tw-flex tw-items-center tw-flex-col">
        <p class="test-class">{$LL.mapEditor.map.refreshPrompt()}</p>
        <button
            type="button"
            class="light tw-m-auto tw-cursor-pointer tw-px-3"
            on:click|preventDefault={() => window.location.reload()}
            >{`${$LL.refreshPrompt.refresh()} (${timeToRefreshSeconds})`}
        </button>
    </div>
</div>

<style lang="scss">
    .refresh {
        pointer-events: auto;
        color: white;
        background-color: rgb(15 31 45);
        z-index: 10000 !important;
        position: absolute !important;
        font-family: "Roboto", sans-serif;
        p {
            font-size: xx-large;
        }
    }
</style>
