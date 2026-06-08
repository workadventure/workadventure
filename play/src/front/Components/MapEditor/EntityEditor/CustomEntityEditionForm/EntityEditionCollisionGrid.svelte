<script lang="ts">
    interface Props {
        collisionGrid: number[][];
        collisionGridHeight: number;
        updateCollisionGrid: (rowIndex: number, columnIndex: number) => void;
    }

    let { collisionGrid = [], collisionGridHeight, updateCollisionGrid }: Props = $props();
</script>

<div class="absolute w-32 grid gap" style={`height: ${collisionGridHeight}px`}>
    {#each collisionGrid as row, rowIndex (rowIndex)}
        {#each row as _, columnIndex (columnIndex)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                style={`grid-area: ${rowIndex + 1} / ${columnIndex + 1}`}
                class={`cursor-pointer border-solid border border-gray-400 rounded-sm ${
                    collisionGrid[rowIndex][columnIndex] === 1 ? "bg-red-600" : ""
                } bg-opacity-30`}
                onclick={() => updateCollisionGrid(rowIndex, columnIndex)}
            ></div>
        {/each}
    {/each}
</div>
