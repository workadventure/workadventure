<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import LL from "../i18n/i18n-svelte";
    import { iframeListener } from "../IframeListener";

    let countReconnection = 10;
    let timeout: NodeJS.Timeout | null = null;

    function chrono() {
        if (countReconnection === 0) {
            return;
        }
        timeout = setTimeout(() => {
            countReconnection -= 1;
            chrono();
        }, 1000);
    }

    onMount(() => {
        chrono();
    });

    onDestroy(() => {
        if (timeout) {
            clearTimeout(timeout);
        }
    });
</script>

<div class="tw-grid tw-place-items-center tw-h-screen refresh">
    <div class="tw-px-5 tw-flex tw-items-center tw-flex-col">
        <p class="tw-text-center">{$LL.needRefresh()} {$LL.reconnecting()} {countReconnection} second(s)</p>
        <div
            style="border-top-color:transparent"
            class="tw-w-16 tw-h-16 tw-border-2 tw-border-white tw-border-solid tw-rounded-full tw-animate-spin tw-mb-5"
        />
        <button
            type="button"
            class="light tw-m-auto tw-cursor-pointer tw-px-3"
            on:click={() => iframeListener.sendRefresh()}>{$LL.refresh()}</button
        >
    </div>
</div>

<style>
    .refresh {
        font-family: "Roboto", sans-serif;
    }
</style>
