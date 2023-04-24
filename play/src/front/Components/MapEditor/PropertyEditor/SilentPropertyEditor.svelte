<script lang="ts">
    import { SilentPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import trashImg from "../../images/trash-x-filled.svg";

    export let property: SilentPropertyData;

    const dispatch = createEventDispatcher();
</script>

<div class="property-settings-container">
    <p>{$LL.mapEditor.properties.silentProperty.label()}</p>
    <button
        class="close-button"
        on:click={() => {
            dispatch("close");
        }}
    >
        <img src={trashImg} alt="" />
    </button>
</div>

<style lang="scss">
    .property-settings-container {
        border: 1px solid grey;
        border-radius: 5px;
        padding: 15px;
        .close-button {
            float: right;
            border-color: red;
            img {
                object-fit: contain;
                max-width: 2em;
                max-height: 2em;
            }
        }
        .close-button:hover {
            background-color: red;
        }
    }
</style>
