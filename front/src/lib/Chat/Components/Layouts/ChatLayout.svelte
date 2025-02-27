<script lang="ts">
</script>

<div class="!flex !flex-col !gap-2 !flex-1 !relative !w-auto !h-full">
    <div class="flex flex-col gap-2">
        <slot name="headerMenu" />
    </div>
    <div class="flex flex-col gap-2 flex-1 min-h-0">
        <slot name="chatContent" />
    </div>
</div>
