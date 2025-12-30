<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { LivekitRoomPropertyData } from "@workadventure/map-editor";
    import { openModal } from "svelte-modals";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import LivekitRoomConfigEditor from "./LivekitRoomConfigEditor.svelte";
    import { IconUsersGroup } from "@wa-icons";

    export let property: LivekitRoomPropertyData;
    export let hasHighlightProperty: boolean;
    export let shouldDisableDisableChatButton: boolean;
    let livekitConfigModalOpened = false;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
        highlightAreaOnEnter: undefined;
    }>();

    function onValueChange() {
        dispatch("change");
    }

    function OpenPopup() {
        openModal(LivekitRoomConfigEditor, {
            visibilityValue: livekitConfigModalOpened,
            config: property.livekitRoomConfig,
            livekitRoomAdminTag: property.livekitRoomAdminTag,
            shouldDisableDisableChatButton: shouldDisableDisableChatButton,
            onSave: (config) => {
                property.livekitRoomConfig = structuredClone(config);
                property.livekitRoomAdminTag = config.livekitRoomAdminTag;
                dispatch("change");
            },
        });
        livekitConfigModalOpened = true;
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <IconUsersGroup font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.livekitRoomProperty.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <Input
                id="roomName"
                type="text"
                label={$LL.mapEditor.properties.livekitRoomProperty.roomNameLabel()}
                placeholder={$LL.mapEditor.properties.livekitRoomProperty.roomNamePlaceholder()}
                bind:value={property.roomName}
                onChange={onValueChange}
            />
        </div>
        <button
            class=" w-full mt-4 btn bg-transparent rounded-md hover:!bg-white/10 transition-all border !border-white py-2"
            on:click={OpenPopup}
            data-testid="livekitRoomMoreOptionsButton"
        >
            {$LL.mapEditor.properties.livekitRoomProperty.moreOptionsLabel()}
        </button>
        {#if !hasHighlightProperty}
            <button
                class=" btn btn-sm btn-light btn-ghost w-full"
                on:click={() => {
                    dispatch("highlightAreaOnEnter");
                }}
            >
                {$LL.mapEditor.properties.livekitRoomProperty.highlightAreaOnEnter()}
            </button>
        {/if}
    </span>
</PropertyEditorBase>

<style lang="scss">
    button {
        flex: 1 1 0px;
        border: 1px solid grey;
        margin-bottom: 0.5em;
    }
    button:hover {
        background-color: rgb(77 75 103);
    }
    .value-switch {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        height: 2.5em;
    }
</style>
