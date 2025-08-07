<script lang="ts">
    import { MatrixRoomPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../../Chat/Components/ChatLoader.svelte";
    import ChatError from "../../../Chat/Components/ChatError.svelte";
    import { isChatIdSentToPusher } from "../../../Chat/Stores/ChatStore";
    import messageSvg from "../../images/applications/icon_message.svg";
    import Input from "../../Input/Input.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    export let property: MatrixRoomPropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();
    let isCreatingRoom = false;
    let creationRoomError = false;
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
        <img class="w-6 me-2" src={messageSvg} alt={$LL.mapEditor.properties.matrixProperties.description()} />
        {$LL.mapEditor.properties.matrixProperties.label()}
    </span>
    <span slot="content">
        {#if !isCreatingRoom && !creationRoomError && isChatIdSentToPusher}
            <div class="area-name-container">
                <Input
                    id="objectName"
                    label={$LL.mapEditor.properties.matrixProperties.roomNameLabel()}
                    type="text"
                    disabled={!property.serverData?.matrixRoomId}
                    placeholder={$LL.mapEditor.properties.matrixProperties.roomNameLabelPlaceholder()}
                    bind:value={property.displayName}
                    onChange={onValueChange}
                />
            </div>
            <InputCheckbox
                id="openAutomaticallyChatLabel"
                label={$LL.mapEditor.properties.matrixProperties.openAutomaticallyChatLabel()}
                dataTestId="shouldOpenAutomaticallyCheckbox"
                bind:value={property.shouldOpenAutomatically}
                onChange={onValueChange}
            />
        {:else if isCreatingRoom && !creationRoomError}
            <ChatLoader label={$LL.chat.createRoom.loadingCreation()} />
        {:else}
            <ChatError label={$LL.chat.createRoom.error()} />
        {/if}
    </span>
</PropertyEditorBase>
