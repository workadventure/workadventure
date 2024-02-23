<script lang="ts">
    export let collisionGrid: number[][] = [];
    export let collisionGridHeight: number;
    export let updateCollisionGrid: (rowIndex: number, columnIndex: number) => void;
</script>

<div class={`tw-absolute tw-w-32 tw-grid tw-gap`} style={`height: ${collisionGridHeight}px`}>
    {#each collisionGrid as row, rowIndex (rowIndex)}
        {#each row as _, columnIndex (columnIndex)}
            <div
                style={`grid-area: ${rowIndex + 1} / ${columnIndex + 1}`}
                class={`tw-cursor-pointer tw-border-solid tw-border tw-border-gray-400 tw-rounded-sm ${
                    collisionGrid[rowIndex][columnIndex] === 1 ? "tw-bg-gray-500" : ""
                } tw-bg-opacity-30`}
                on:click={() => updateCollisionGrid(rowIndex, columnIndex)}
            />
        {/each}
    {/each}
</div>
