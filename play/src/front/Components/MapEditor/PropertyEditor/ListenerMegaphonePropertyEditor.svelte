<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { ListenerMegaphonePropertyData } from "@workadventure/map-editor";
    import { HeadphonesIcon } from "svelte-feather-icons";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: ListenerMegaphonePropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <HeadphonesIcon class="tw-w-6 tw-mr-1" />
        {$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <label for="tabLink">{$LL.mapEditor.properties.listenerMegaphoneProperties.nameLabel()}</label>
            <input
                id="tabLink"
                type="text"
                placeholder={$LL.mapEditor.properties.listenerMegaphoneProperties.namePlaceholder()}
                bind:value={property.speakerZoneName}
                on:change={onValueChange}
                on:focus={onMapEditorInputFocus}
                on:blur={onMapEditorInputUnfocus}
            />
        </div>
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-input {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
