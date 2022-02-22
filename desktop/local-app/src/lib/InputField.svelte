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
    <!-- <input class="shadow appearance-none border border-red-500 rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" placeholder="******************"> -->
    {#if description.length > 0}
        <p class="text-gray-200 text-xs mt-1 italic">{description}</p>
    {/if}
</div>
