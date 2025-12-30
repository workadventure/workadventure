<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { IconMicrophone } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: SpeakerMegaphonePropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    function onValueChange() {
        // Replace all special characters or spaces with an empty string
        property.name = property.name
            .trim()
            .replace(/[^a-zA-Z0-9 !@#$%^&*]/g, "")
            .replaceAll(" ", "")
            .toLowerCase();
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <IconMicrophone font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.speakerMegaphone.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <Input
                id="tabLink"
                type="text"
                label={$LL.mapEditor.properties.speakerMegaphone.nameLabel()}
                placeholder={$LL.mapEditor.properties.speakerMegaphone.namePlaceholder()}
                bind:value={property.name}
                onChange={onValueChange}
            />
        </div>
        <div class="value-switch">
            <InputSwitch
                id="chatEnabled"
                label={$LL.mapEditor.properties.chatEnabled()}
                bind:value={property.chatEnabled}
                onChange={onValueChange}
            />
        </div>
    </span>
</PropertyEditorBase>
