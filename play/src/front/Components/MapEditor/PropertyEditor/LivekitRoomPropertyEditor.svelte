<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LivekitRoomPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: LivekitRoomPropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    function onValueChange() {
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <img
            draggable="false"
            class="w-6 me-2"
            src="resources/icons/icon_meeting.png"
            alt={$LL.mapEditor.properties.livekitProperties.description()}
        />
        {$LL.mapEditor.properties.livekitProperties.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <Input
                id="roomName"
                type="text"
                label={$LL.mapEditor.properties.livekitProperties.roomNameLabel()}
                placeholder={$LL.mapEditor.properties.livekitProperties.roomNamePlaceholder()}
                bind:value={property.roomName}
                onChange={onValueChange}
            />
        </div>
    </span>
</PropertyEditorBase>

<style lang="scss">
    button {
        flex: 1 1 0px;
        border: 1px solid grey;
        margin-bottom: 0.5em;
    }
    button:hover {
        background-color: rgb(77 75 103);
    }
    .value-switch {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        height: 2.5em;
    }
</style>
