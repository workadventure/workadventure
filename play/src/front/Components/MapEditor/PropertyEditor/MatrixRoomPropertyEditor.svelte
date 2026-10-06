<script lang="ts">
    import type { MatrixRoomPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../../Chat/Components/ChatLoader.svelte";
    import ChatError from "../../../Chat/Components/ChatError.svelte";
    import { isChatIdSentToPusher } from "../../../Chat/Stores/ChatStore";
    import Input from "../../Input/Input.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import { IconMessage } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    interface Props {
        property: MatrixRoomPropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    let isCreatingRoom = false;
    let creationRoomError = false;
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
            <IconMessage font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.matrixRoomPropertyData.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            {#if !isCreatingRoom && !creationRoomError && isChatIdSentToPusher}
                <div class="area-name-container">
                    <Input
                        id="objectName"
                        label={$LL.mapEditor.properties.matrixRoomPropertyData.roomNameLabel()}
                        type="text"
                        disabled={!property.serverData?.matrixRoomId}
                        placeholder={$LL.mapEditor.properties.matrixRoomPropertyData.roomNameLabelPlaceholder()}
                        bind:value={property.displayName}
                        onchange={onValueChange}
                    />
                </div>
                <InputCheckbox
                    id="openAutomaticallyChatLabel"
                    label={$LL.mapEditor.properties.matrixRoomPropertyData.openAutomaticallyChatLabel()}
                    dataTestId="shouldOpenAutomaticallyCheckbox"
                    bind:value={property.shouldOpenAutomatically}
                    onchange={onValueChange}
                />
            {:else if isCreatingRoom && !creationRoomError}
                <ChatLoader label={$LL.chat.createRoom.loadingCreation()} />
            {:else}
                <ChatError label={$LL.chat.createRoom.error()} />
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>
