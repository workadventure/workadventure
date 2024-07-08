<script lang="ts">
</script>

<div class="!tw-flex !tw-flex-col !tw-gap-2 !tw-flex-1 !tw-relative !tw-w-auto !tw-h-full">
    <div class="tw-flex tw-flex-col tw-gap-2">
        <slot name="headerMenu" />
    </div>
    <div class="tw-flex tw-flex-col tw-gap-2 tw-flex-1 tw-min-h-0">
        <slot name="chatContent" />
    </div>
</div>
