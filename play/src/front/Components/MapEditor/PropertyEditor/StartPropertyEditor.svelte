<script lang="ts">
    import type { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import { IconDoorIn } from "../../Icons";
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
        // Replace all special characters or spaces with an empty string
        if (property.isDefault === false)
            updateStartAreaNameCallback(
                startAreaName
                    .trim()
                    .replace(/[^a-zA-Z0-9 !@#$%^&*]/g, "")
                    .replaceAll(" ", "-")
                    .toLowerCase(),
            );
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
