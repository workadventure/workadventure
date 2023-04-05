<script lang="ts">
    import { LL } from "../i18n/i18n-svelte";
    import { iframeListener } from "../IframeListener";
</script>

<div class="tw-grid tw-place-items-center tw-h-screen refresh">
    <div class="tw-px-5 tw-flex tw-items-center tw-flex-col">
        <p class="tw-text-center">{$LL.needRefresh()}</p>
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
