<script lang="ts">
    import LL from "../i18n/i18n-svelte";
</script>
<div class="tw-grid tw-place-items-center tw-h-screen loader">
    <div class="tw-flex tw-items-center tw-flex-col">
        <div style="border-top-color:transparent" class="tw-w-16 tw-h-16 tw-border-2 tw-border-white tw-border-solid tw-rounded-full tw-animate-spin tw-mb-5"></div>
        <div class="tw-animate-pulse">{$LL.reconnecting()}</div>
    </div>
</div>
<style>
    .loader{
        font-family: 'Roboto', sans-serif;
    }
</style>
