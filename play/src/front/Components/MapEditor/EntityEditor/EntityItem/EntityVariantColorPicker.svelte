<script lang="ts">
    interface Props {
        colors: string[];
        selectedColor: string;
        onColorChange: (color: string) => void;
    }

    let { colors, selectedColor, onColorChange }: Props = $props();
</script>

{#if colors.length > 1}
    <p class="m-0 text-xxs">Colors</p>
    <div class="flex flex-row gap-2">
        {#each colors as color (color)}
            <div class="hover:cursor-pointer">
                <button
                    aria-label={color}
                    class={`w-4 h-4 rounded-full p-0 ${
                        selectedColor === color ? "border-solid border-yellow-400 rounded-full" : ""
                    }`}
                    style="background-color: {color};"
                    onclick={() => onColorChange(color)}
                ></button>
            </div>
        {/each}
    </div>
{/if}
