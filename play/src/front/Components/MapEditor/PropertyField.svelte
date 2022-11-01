<script lang="ts">
    import type { PredefinedPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import walk from "../../../../public/static/images/logo-WA-min.png";
    import { mapEditorSelectedPropertyStore } from "../../Stores/MapEditorStore";

    export let propertyData: PredefinedPropertyData;

    const dispatch = createEventDispatcher();

    function setAsCurrentlySelectedPropertiesData() {
        if ($mapEditorSelectedPropertyStore) {
            mapEditorSelectedPropertyStore.set(undefined);
            return;
        }
        console.log(propertyData);
        mapEditorSelectedPropertyStore.set(propertyData);
    }

    function emitUpdateEvent() {
        dispatch("update");
    }
</script>

<div
    class="map-editor-property-option-box tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple tw-cursor-pointer"
    on:click={setAsCurrentlySelectedPropertiesData}
>
    <img src={walk} alt="icon" class="option-box-icon" />
    <div class="option-box-text">
        <h3>{propertyData.name}</h3>
        <p>{propertyData.description}</p>
    </div>
    <input
        type="checkbox"
        id="silent"
        bind:checked={propertyData.turnedOn}
        on:change={emitUpdateEvent}
        on:click|stopPropagation
    />
</div>

<style lang="scss">
    .map-editor-property-option-box {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        max-width: 100%;
        gap: 10px;
        // border-top: 1px solid black;
        // border-bottom: 1px solid black;
        padding: 5px 15px 5px 15px;
    }

    // .option-box-icon {
    //     max-width: 64px;
    // }

    // .option-box-icon {
    //     flex-grow: 1;
    // }

    .option-box-text {
        h3 {
            margin: 0;
        }
        p {
            margin: 0;
        }
        flex-grow: 2;
    }
</style>
