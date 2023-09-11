<script lang="ts">
    import { LL } from "../i18n/i18n-svelte";
    import { iframeListener } from "../IframeListener";
</script>

<div class="grid place-items-center h-screen refresh">
    <div class="px-5 flex items-center flex-col">
        <p class="text-center">{$LL.needRefresh()}</p>
        <button type="button" class="light m-auto cursor-pointer px-3" on:click={() => iframeListener.sendRefresh()}
            >{$LL.refresh()}</button
        >
    </div>
</div>

<style>
    .refresh {
        font-family: "Roboto", sans-serif;
    }
</style>
