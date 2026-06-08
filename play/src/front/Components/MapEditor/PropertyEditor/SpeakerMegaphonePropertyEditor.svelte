<script lang="ts">
    import type { SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { IconMicrophone } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: SpeakerMegaphonePropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    function onValueChange() {
        // Replace all special characters or spaces with an empty string
        property.name = property.name
            .trim()
            .replace(/[^a-zA-Z0-9 !@#$%^&*]/g, "")
            .replaceAll(" ", "")
            .toLowerCase();
        onchange?.();
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconMicrophone font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.speakerMegaphone.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <div class="value-input">
                <Input
                    id="tabLink"
                    type="text"
                    label={$LL.mapEditor.properties.speakerMegaphone.nameLabel()}
                    placeholder={$LL.mapEditor.properties.speakerMegaphone.namePlaceholder()}
                    bind:value={property.name}
                    onchange={onValueChange}
                />
            </div>
            <div class="value-switch">
                <InputSwitch
                    id="chatEnabled"
                    label={$LL.mapEditor.properties.chatEnabled()}
                    bind:value={property.chatEnabled}
                    onchange={onValueChange}
                />
            </div>
            <div class="value-switch">
                <InputSwitch
                    id="seeAttendees"
                    label={$LL.mapEditor.properties.seeAttendees()}
                    bind:value={property.seeAttendees}
                    onchange={onValueChange}
                />
            </div>
        </span>
    {/snippet}
</PropertyEditorBase>
