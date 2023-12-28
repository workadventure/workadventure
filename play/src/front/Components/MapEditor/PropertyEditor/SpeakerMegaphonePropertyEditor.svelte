<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: SpeakerMegaphonePropertyData;

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
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_speaker.png"
            alt={$LL.mapEditor.properties.speakerMegaphoneProperties.description()}
        />
        {$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <label for="tabLink">{$LL.mapEditor.properties.speakerMegaphoneProperties.nameLabel()}</label>
            <input
                id="tabLink"
                type="text"
                placeholder={$LL.mapEditor.properties.speakerMegaphoneProperties.namePlaceholder()}
                bind:value={property.name}
                on:change={onValueChange}
            />
        </div>
        <div class="value-switch">
            <label for="chatEnabled">{$LL.mapEditor.properties.chatEnabled()}</label>
            <input
                id="chatEnabled"
                type="checkbox"
                class="input-switch"
                bind:checked={property.chatEnabled}
                on:change={onValueChange}
            />
        </div>
    </span>
</PropertyEditorBase>
