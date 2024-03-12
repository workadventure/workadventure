<script lang="ts">
    export let text: string;
    export let height: string = "tw-h-screen";
</script>

<div class={`tw-grid tw-place-items-center ${height} loader`}>
    <div class="tw-flex tw-items-center tw-flex-col">
        <div
            style="border-top-color:transparent"
            class="tw-w-16 tw-h-16 tw-border-2 tw-border-white tw-border-solid tw-rounded-full tw-animate-spin tw-mb-5"
        />
        <div class="tw-animate-pulse">{text}</div>
    </div>
</div>

<style>
    .loader {
        font-family: "Roboto", sans-serif;
    }
</style>
