<script lang="ts">
    export let title: string;
    export let id: string;
    export let description: string = "";
</script>

<div class="mb-6">
    <label class="block text-gray-200 text-lg font-bold mb-1" for={id}>
        {title}
    </label>
    <slot />
    {#if description.length > 0}
        <p class="text-gray-200 text-xs mt-1 italic">{description}</p>
    {/if}
</div>
