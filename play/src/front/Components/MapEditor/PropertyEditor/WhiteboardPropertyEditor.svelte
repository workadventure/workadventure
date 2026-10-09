<script lang="ts">
    import type { WhiteboardPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import Input from "../../Input/Input.svelte";
    import { ON_ACTION_TRIGGER_BUTTON, ON_ACTION_TRIGGER_ENTER } from "../../../WebRtc/LayoutManager";
    import excalidrawSvg from "../../images/applications/icon_excalidraw.svg";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: WhiteboardPropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <img draggable="false" src={excalidrawSvg} class="w-5 h-5 mr-2" alt="" />
            {$LL.mapEditor.properties.whiteboard.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <Select
                id="whiteboardTrigger"
                label={$LL.mapEditor.properties.openWebsite.trigger()}
                bind:value={property.trigger}
                onchange={() => onchange?.()}
            >
                <option value={ON_ACTION_TRIGGER_ENTER}>
                    {$LL.mapEditor.properties.openWebsite.triggerShowImmediately()}
                </option>
                <option value={ON_ACTION_TRIGGER_BUTTON}>
                    {$LL.mapEditor.properties.openWebsite.triggerOnAction()}
                </option>
            </Select>
            {#if property.trigger === ON_ACTION_TRIGGER_BUTTON}
                <Input
                    id="whiteboardTriggerMessage"
                    type="text"
                    placeholder={$LL.trigger.object()}
                    label={$LL.mapEditor.properties.openWebsite.triggerMessage()}
                    bind:value={property.triggerMessage}
                    onchange={() => onchange?.()}
                />
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>
