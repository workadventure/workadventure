<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    export let id: string;
    export let value: boolean;
    export let title: string = null;
</script>

<div class="flex w-full my-2">
    <label for={id} class="flex items-center cursor-pointer">
        <div class="relative">
            <input
                {id}
                type="checkbox"
                class="sr-only"
                checked={value}
                on:change={(e) => {
                    dispatch("change", e.target.checked);
                }}
            />
            <div class="w-10 h-4 bg-gray-400 rounded-full shadow-inner" />
            <div class="dot absolute w-6 h-6 bg-gray-500 rounded-full shadow -left-1 -top-1 transition" />
        </div>
        {#if title}
            <div class="ml-4 text-gray-200 text-sm">{title}</div>
        {/if}
    </label>
</div>

<style>
    input:checked ~ .dot {
        transform: translateX(100%);
        background-color: #0369a1;
    }
</style>
