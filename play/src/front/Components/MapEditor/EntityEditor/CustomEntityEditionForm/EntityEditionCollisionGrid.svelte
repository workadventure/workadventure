<script lang="ts">
    export let collisionGrid: number[][] = [];
    export let collisionGridHeight: number;
    export let updateCollisionGrid: (rowIndex: number, columnIndex: number) => void;
</script>

<div class="absolute w-32 grid gap" style={`height: ${collisionGridHeight}px`}>
    {#each collisionGrid as row, rowIndex (rowIndex)}
        {#each row as _, columnIndex (columnIndex)}
            <div
                style={`grid-area: ${rowIndex + 1} / ${columnIndex + 1}`}
                class={`cursor-pointer border-solid border border-gray-400 rounded-sm ${
                    collisionGrid[rowIndex][columnIndex] === 1 ? "bg-red-600" : ""
                } bg-opacity-30`}
                on:click={() => updateCollisionGrid(rowIndex, columnIndex)}
            />
        {/each}
    {/each}
</div>
