<script lang="ts">
    import type { MaxUsersInAreaPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import { IconLockHash } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: MaxUsersInAreaPropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    function onValueChange() {
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
            <IconLockHash font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.maxUsersInAreaPropertyData.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <div class="value-input">
                <Input
                    id="maxUsersInArea"
                    type="number"
                    label={$LL.mapEditor.properties.maxUsersInAreaPropertyData.label()}
                    placeholder={$LL.mapEditor.properties.maxUsersInAreaPropertyData.placeholder()}
                    bind:value={property.maxUsers}
                    onchange={onValueChange}
                    min={0}
                />
            </div>
        </span>
    {/snippet}
</PropertyEditorBase>
