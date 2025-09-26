<script lang="ts">
    export let headerText: string | undefined;
    export let descriptionText: string | undefined;
</script>

<div class="max-w-[200px] z-[310] p-2 text-xs bg-contrast backdrop-blur rounded-md text-white max-w-full">
    <p class="text-sm m-0 font-semibold">{headerText}</p>
    {#if descriptionText}
        <p class="m-0">{descriptionText}</p>
    {/if}
</div>
