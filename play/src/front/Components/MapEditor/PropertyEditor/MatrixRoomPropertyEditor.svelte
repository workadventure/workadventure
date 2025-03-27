<script lang="ts">
    import { MatrixRoomPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../../Chat/Components/ChatLoader.svelte";
    import ChatError from "../../../Chat/Components/ChatError.svelte";
    import { isChatIdSentToPusher } from "../../../Chat/Stores/ChatStore";
    import messageSvg from "../../images/applications/icon_message.svg";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    export let property: MatrixRoomPropertyData;

    const dispatch = createEventDispatcher();
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
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img class="tw-w-6 tw-mr-1" src={messageSvg} alt={$LL.mapEditor.properties.matrixProperties.description()} />
        {$LL.mapEditor.properties.matrixProperties.label()}
    </span>
    <span slot="content">
        {#if !isCreatingRoom && !creationRoomError && isChatIdSentToPusher}
            <div class="area-name-container">
                <label for="objectName">{$LL.mapEditor.properties.matrixProperties.roomNameLabel()} : </label>
                <input
                    id="objectName"
                    type="text"
                    disabled={!property.serverData?.matrixRoomId}
                    placeholder={$LL.mapEditor.properties.matrixProperties.roomNameLabelPlaceholder()}
                    bind:value={property.displayName}
                    on:change={onValueChange}
                />
            </div>
            <div class="value-input">
                <input
                    id="openAutomaticallyChatLabel"
                    data-testid="shouldOpenAutomaticallyCheckbox"
                    type="checkbox"
                    class="tw-w-4 tw-h-4"
                    bind:checked={property.shouldOpenAutomatically}
                    on:change={onValueChange}
                />
                <label for="openAutomaticallyChatLabel"
                    >{$LL.mapEditor.properties.matrixProperties.openAutomaticallyChatLabel()}</label
                >
            </div>
        {:else if isCreatingRoom && !creationRoomError}
            <ChatLoader label={$LL.chat.createRoom.loadingCreation()} />
        {:else}
            <ChatError label={$LL.chat.createRoom.error()} />
        {/if}
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-input {
        display: flex;
        flex-direction: row;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        gap: 10px;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 0;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
