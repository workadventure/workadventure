<script lang="ts">
    export let title: string = "WorkAdventure chat";
    export let className: string = "";
</script>

<div class="head">
    <h2 class={className}>{title}</h2>
</div>
<div class="tw-h-[55px] tw-w-full" />

<style lang="scss">
    .head {
        @apply tw-z-10 tw-fixed tw-h-[50px] tw-w-full tw-m-0 tw-p-0 tw-flex tw-flex-wrap tw-items-center tw-pl-4  tw-border-solid tw-border-0 tw-border-b tw-border-b-lighter-purple tw-mb-2 tw-bg-dark-purple;
        h2 {
            @apply tw-m-0 tw-p-0 tw-text-white;
        }
    }
</style>
