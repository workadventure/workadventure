<script lang="ts">
    import type { LivekitRoomConfigData, LivekitRoomPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import Button from "../../UI/Button.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import LivekitRoomConfigEditor from "./LivekitRoomConfigEditor.svelte";
    import { IconUsersGroup } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        property: LivekitRoomPropertyData;
        hasHighlightProperty: boolean;
        shouldDisableDisableChatButton: boolean;
        onchange?: () => void;
        onclose?: () => void;
        onhighlightareaonenter?: () => void;
    }

    let {
        property = $bindable(),
        hasHighlightProperty,
        shouldDisableDisableChatButton,
        onchange,
        onclose,
        onhighlightareaonenter,
    }: Props = $props();
    let livekitConfigModalOpened = false;

    function onValueChange() {
        onchange?.();
    }

    function OpenPopup() {
        modals.open(LivekitRoomConfigEditor, {
            visibilityValue: livekitConfigModalOpened,
            config: property.livekitRoomConfig,
            livekitRoomAdminTag: property.livekitRoomAdminTag,
            shouldDisableDisableChatButton: shouldDisableDisableChatButton,
            onsave: (config: LivekitRoomConfigData & { livekitRoomAdminTag: string }) => {
                property.livekitRoomConfig = $state.snapshot(config);
                property.livekitRoomAdminTag = config.livekitRoomAdminTag;
                onchange?.();
            },
        });
        livekitConfigModalOpened = true;
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconUsersGroup font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.livekitRoomProperty.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <div class="value-input">
                <Input
                    id="roomName"
                    type="text"
                    label={$LL.mapEditor.properties.livekitRoomProperty.roomNameLabel()}
                    placeholder={$LL.mapEditor.properties.livekitRoomProperty.roomNamePlaceholder()}
                    bind:value={property.roomName}
                    onchange={onValueChange}
                />
            </div>
            <Button
                class="livekit-config-btn w-full mt-4 bg-transparent rounded-md hover:!bg-white/10 transition-all border !border-white py-2"
                onclick={OpenPopup}
                dataTestId="livekitRoomMoreOptionsButton"
            >
                {$LL.mapEditor.properties.livekitRoomProperty.moreOptionsLabel()}
            </Button>
            {#if !hasHighlightProperty}
                <Button
                    variant="light"
                    appearance="ghost"
                    size="sm"
                    class="livekit-config-btn w-full"
                    onclick={() => {
                        onhighlightareaonenter?.();
                    }}
                >
                    {$LL.mapEditor.properties.livekitRoomProperty.highlightAreaOnEnter()}
                </Button>
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>

<style>
    /* Global so it reaches the <button> rendered by <Button> (scoped CSS would not). */
    :global(.livekit-config-btn) {
        flex: 1 1 0px;
        border: 1px solid grey;
    }
    :global(.livekit-config-btn):hover {
        background-color: rgb(77 75 103);
    }
</style>
