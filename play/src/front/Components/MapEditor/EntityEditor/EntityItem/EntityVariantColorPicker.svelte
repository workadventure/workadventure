<script lang="ts">
    export let colors: string[];
    export let selectedColor: string;
    export let onColorChange: (color: string) => void;
</script>

{#if colors.length > 1}
    <p class="tw-m-0 tw-text-xxs">Colors</p>
    <div class="tw-flex tw-flex-row tw-gap-2">
        {#each colors as color (color)}
            <div class={`hover:tw-cursor-pointer`}>
                <button
                    class={`tw-w-4 tw-h-4 tw-rounded-full tw-p-0 ${
                        selectedColor === color ? "tw-border-solid tw-border-yellow-400 tw-rounded-full" : ""
                    }`}
                    style="background-color: {color};"
                    on:click={() => onColorChange(color)}
                />
            </div>
        {/each}
    </div>
{/if}
