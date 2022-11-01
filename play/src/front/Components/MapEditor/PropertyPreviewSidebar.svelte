<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { mapEditorSelectedPropertyStore } from "../../Stores/MapEditorStore";

    const dispatch = createEventDispatcher();

    function emitUpdateEvent() {
        dispatch("update");
    }
</script>

{#if $mapEditorSelectedPropertyStore}
    <div class="area-details-window tw-bg-purple/95">
        <h2>{$mapEditorSelectedPropertyStore.name}</h2>
        <div>
            {#each Object.entries($mapEditorSelectedPropertyStore.additionalProperties) as property}
                {#if typeof property[1] === "number"}
                    <div class="field">
                        <p class="blue-title">{property[0]}:</p>
                        <!-- Better way of keeping the reference to the store's object? -->
                        <input
                            bind:value={$mapEditorSelectedPropertyStore.additionalProperties[property[0]]}
                            type="number"
                            on:change={emitUpdateEvent}
                        />
                    </div>
                {:else if typeof property[1] === "string"}
                    <div class="field">
                        <p class="blue-title">{property[0]}:</p>
                        <input
                            bind:value={$mapEditorSelectedPropertyStore.additionalProperties[property[0]]}
                            type="text"
                            on:change={emitUpdateEvent}
                        />
                    </div>
                {:else if typeof property[1] === "boolean"}
                    <div class="field">
                        <p class="blue-title">{property[0]}:</p>
                        <input
                            bind:value={$mapEditorSelectedPropertyStore.additionalProperties[property[0]]}
                            type="checkbox"
                            on:change={emitUpdateEvent}
                        />
                    </div>
                {:else if typeof property[1] === "object"}
                    TODO: recursive call somehow
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .area-details-window {
        height: 100%;
        border: 1px solid black;
        box-shadow: 0px 0px 30px black;
        width: fit-content;
        min-width: 350px;
    }
</style>
