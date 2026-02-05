<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { MaxUsersInAreaPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import { IconLockCancel } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: MaxUsersInAreaPropertyData;

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
        <IconLockCancel font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.maxUsersInAreaPropertyData.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <Input
                id="maxUsersInArea"
                type="number"
                label={$LL.mapEditor.properties.maxUsersInAreaPropertyData.label()}
                placeholder={$LL.mapEditor.properties.maxUsersInAreaPropertyData.placeholder()}
                bind:value={property.maxUsers}
                onChange={onValueChange}
                min={0}
            />
        </div>
    </span>
</PropertyEditorBase>
