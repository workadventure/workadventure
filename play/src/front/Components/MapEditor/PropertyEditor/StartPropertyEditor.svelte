<script lang="ts">
    import type { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import { IconDoorIn } from "../../Icons";
    import { StringUtils } from "../../../Utils/StringUtils";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: StartPropertyData;
        startAreaName: string;
        updateStartAreaNameCallback: (name: string) => void;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), startAreaName, updateStartAreaNameCallback, onchange, onclose }: Props = $props();

    function onValueChange() {
        // The name is used after the "#" of the room URL
        if (property.isDefault === false) updateStartAreaNameCallback(StringUtils.toUrlHashName(startAreaName));
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
            <IconDoorIn font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.start.label()}
        </span>
    {/snippet}

    {#snippet content()}
        <span>
            <div>
                <p class="text-sm text-white/50 px-2 m-0">{$LL.mapEditor.properties.start.infoAreaName()}</p>

                <Select
                    id="startTypeSelector"
                    label={$LL.mapEditor.properties.start.type()}
                    bind:value={property.isDefault}
                    onchange={() => {
                        onValueChange();
                    }}
                >
                    <option value={true}>{$LL.mapEditor.properties.start.defaultMenuItem()}</option>
                    <option value={false}>{$LL.mapEditor.properties.start.hashMenuItem()}</option>
                </Select>
            </div>
        </span>
    {/snippet}
</PropertyEditorBase>
