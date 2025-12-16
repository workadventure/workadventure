<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import type { LivekitRoomConfigData } from "@workadventure/map-editor";
    import { closeModal } from "svelte-modals";
    import { LL } from "../../../../i18n/i18n-svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import PopUpContainer from "../../PopUp/PopUpContainer.svelte";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    export let isOpen: boolean;
    export let onSave: (config: LivekitRoomConfigData & { livekitRoomAdminTag: string }) => void;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    let defaultConfig: LivekitRoomConfigData = {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableChat: false,
    };

    type LivekitRoomConfigDataKeys = "startWithAudioMuted" | "startWithVideoMuted" | "disableChat";

    const defaultConfigKeys: LivekitRoomConfigDataKeys[] = Object.keys(defaultConfig).map(
        (key) => key as LivekitRoomConfigDataKeys
    );

    export let visibilityValue: boolean;
    export let config: LivekitRoomConfigData;
    export let livekitRoomAdminTag = "";
    export let shouldDisableDisableChatButton: boolean;
    let currentConfig = {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableChat: false,
    };

    onMount(() => {
        currentConfig = {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableChat: false,
        };
        if (config !== undefined) {
            currentConfig = structuredClone(config);
        }
    });

    function close() {
        visibilityValue = false;
        closeModal();
        dispatch("close");
    }

    function saveAndClose() {
        onSave({ ...currentConfig, livekitRoomAdminTag });
        close();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />
{#if isOpen}
    <div class="absolute flex items-center justify-center w-full h-full">
        <div
            class="backdrop-blur-md text-white z-[2001] w-[90%] m-auto left-0 right-0 sm:max-w-[668px] rounded-3xl max-h-full overflow-y-auto pointer-events-auto"
        >
            <PopUpContainer fullContent={true}>
                <div class="flex items-center justify-between">
                    <span class="font-bold text-xl pl-4"
                        >{$LL.mapEditor.properties.livekitRoomProperty.moreOptionsLabel()}
                    </span>
                    <ButtonClose on:click={close} />
                </div>
                <div class="config-element-container mt-5">
                    {#each defaultConfigKeys as configKey (configKey)}
                        <div class="config-element">
                            {#if typeof defaultConfig[configKey] === "string"}
                                <input id={configKey} type="text" bind:value={currentConfig[configKey]} />
                            {:else if typeof defaultConfig[configKey] === "boolean"}
                                <InputSwitch
                                    id={configKey}
                                    bind:value={currentConfig[configKey]}
                                    label={$LL.mapEditor.properties.livekitRoomProperty.livekitRoomConfig[configKey]()}
                                    disabled={shouldDisableDisableChatButton && configKey === "disableChat"}
                                />
                            {/if}
                        </div>
                    {/each}
                    <div class="config-element mt-4">
                        <Input
                            id="livekitRoomAdminTag"
                            label={$LL.mapEditor.properties.livekitRoomProperty.livekitRoomConfig.livekitRoomAdminTag()}
                            type="text"
                            bind:value={livekitRoomAdminTag}
                        />
                    </div>
                </div>

                <div slot="buttons" class="w-full flex justify-between gap-2 p-2">
                    <button class=" btn btn-light btn-border w-full h-12" on:click={closeModal}>
                        {$LL.mapEditor.properties.livekitRoomProperty.livekitRoomConfig.cancel()}
                    </button>
                    <button
                        class=" btn btn-secondary w-full h-12"
                        data-testid="livekitRoomConfigValidateButton"
                        on:click={saveAndClose}
                    >
                        {$LL.mapEditor.properties.livekitRoomProperty.livekitRoomConfig.validate()}
                    </button>
                </div>
            </PopUpContainer>
        </div>
    </div>
{/if}

<style lang="scss">
    .config-element-container {
        overflow-y: auto;
        overflow-x: hidden;
        .config-element {
            display: flex;
            flex-direction: row;
            height: 2.5em;

            .config-element-label {
                padding-left: 1em;
                vertical-align: middle;
                margin-top: auto;
                margin-bottom: auto;
                flex-grow: 1;
            }
            input[type="text"] {
                margin-top: 0.25em;
                margin-bottom: 0.25em;
                padding-top: 0.25em;
                padding-bottom: 0.25em;
            }

            button {
                padding: 0;
                .delete-button {
                    border-radius: 0.75em;
                    background-color: black;
                    margin: 0em;
                    padding: 0em;
                    height: 1.5em;
                    width: 1.5em;
                    line-height: 1.5em;
                }
            }
        }
    }
</style>
