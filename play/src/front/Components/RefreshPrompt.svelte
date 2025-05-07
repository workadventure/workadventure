<script lang="ts">
    import { onMount } from "svelte";
    import { refreshPromptStore } from "../Stores/RefreshPromptStore";
    import { LL } from "../../i18n/i18n-svelte";

    let timeToRefreshSeconds = $refreshPromptStore?.timeToRefresh ?? 30;

    onMount(() => {
        setInterval(() => {
            if (timeToRefreshSeconds <= 0) {
                window.location.reload();
            } else {
                timeToRefreshSeconds--;
            }
        }, 1000);
    });
</script>

<div class="grid place-items-center h-dvh refresh min-w-full w-screen bg-contrast">
    <div class="px-10 py-80 flex items-center flex-col">
        <p class="test-class">{$LL.mapEditor.map.refreshPrompt()}</p>
        <button
            type="button"
            class="light m-auto cursor-pointer px-3"
            on:click|preventDefault={() => window.location.reload()}
            >{`${$LL.refreshPrompt.refresh()} (${timeToRefreshSeconds})`}
        </button>
    </div>
</div>

<style lang="scss">
    .refresh {
        pointer-events: auto;
        color: white;
        z-index: 10000 !important;
        position: absolute !important;
        font-family: "Roboto", sans-serif;
        p {
            font-size: xx-large;
        }
    }
</style>
