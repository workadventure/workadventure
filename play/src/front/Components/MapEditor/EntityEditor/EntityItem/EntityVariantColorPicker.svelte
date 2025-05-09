<script lang="ts">
    export let colors: string[];
    export let selectedColor: string;
    export let onColorChange: (color: string) => void;
</script>

{#if colors.length > 1}
    <p class="m-0 text-xxs">Colors</p>
    <div class="flex flex-row gap-2">
        {#each colors as color (color)}
            <div class="hover:cursor-pointer">
                <button
                    class={`w-4 h-4 rounded-full p-0 ${
                        selectedColor === color ? "border-solid border-yellow-400 rounded-full" : ""
                    }`}
                    style="background-color: {color};"
                    on:click={() => onColorChange(color)}
                />
            </div>
        {/each}
    </div>
{/if}
