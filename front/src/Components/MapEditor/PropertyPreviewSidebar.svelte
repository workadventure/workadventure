<script lang="ts">
    import { mapEditorSelectePropertyStore } from "../../Stores/MapEditorStore";
</script>

{#if $mapEditorSelectePropertyStore}
    <div class="area-details-window tw-bg-purple/95">
        <h2>{$mapEditorSelectePropertyStore.name}</h2>
        <div>
            {#each Object.entries($mapEditorSelectePropertyStore.additionalProperties) as property}
                <p>{property[0]}</p>
                {#if typeof property[1] === "number"}
                    TODO: number input
                {:else if typeof property[1] === "string"}
                    TODO: string inut
                {:else if typeof property[1] === "boolean"}
                    TODO: checkbox
                {:else if typeof property[1] === "object"}
                    TODO: recursive call
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
