<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { JitsiRoomConfigData } from "@workadventure/map-editor";
    import { closeModal } from "svelte-modals";
    import { LL } from "../../../../i18n/i18n-svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import PopUpContainer from "../../PopUp/PopUpContainer.svelte";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    export let isOpen: boolean;
    export let onSave: (config: JitsiRoomConfigData) => void;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    let defaultConfig: JitsiRoomConfigData = {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
    };

    type JitsiRoomConfigDataKeys = "startWithAudioMuted" | "startWithVideoMuted";

    const defaultConfigKeys: JitsiRoomConfigDataKeys[] = Object.keys(defaultConfig).map(
        (key) => key as JitsiRoomConfigDataKeys
    );

    export let visibilityValue: boolean;
    export let config: JitsiRoomConfigData;
    export let jitsiRoomAdminTag = "";
    let currentConfig: JitsiRoomConfigData = {};

    onMount(() => {
        currentConfig = {};
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
        onSave(currentConfig);
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
                        >{$LL.mapEditor.properties.jitsiProperties.moreOptionsLabel()}
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
                                    label={$LL.mapEditor.properties.jitsiProperties.jitsiRoomConfig[configKey]()}
                                />
                            {/if}
                        </div>
                    {/each}
                    <div class="config-element mt-4">
                        <Input
                            id="jitsiAdminTag"
                            label={$LL.mapEditor.properties.jitsiProperties.jitsiRoomConfig.jitsiRoomAdminTag()}
                            type="text"
                            bind:value={jitsiRoomAdminTag}
                        />
                    </div>
                </div>

                <div slot="buttons" class="w-full flex justify-between gap-2 p-2">
                    <button class=" btn btn-light btn-border w-full h-12" on:click={closeModal}>
                        {$LL.mapEditor.properties.jitsiProperties.jitsiRoomConfig.cancel()}
                    </button>
                    <button class=" btn btn-secondary w-full h-12 " on:click={saveAndClose}>
                        {$LL.mapEditor.properties.jitsiProperties.jitsiRoomConfig.validate()}
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

    // .action-buttons {
    //     position: absolute;
    //     bottom: 1em;
    //     left: 0;
    //     right: 0;
    //     align-content: center;
    //     display: flex;
    //     flex-direction: row;
    //     justify-content: center;
    //     button {
    //         border-radius: 0.25em;
    //         border: solid 1px grey;
    //     }
    //     button:hover {
    //         background-color: rgb(77 75 103);
    //     }
    // }
    // .input-switch {
    //     position: relative;
    //     top: 0px;
    //     right: 0px;
    //     bottom: 0px;
    //     left: 0px;
    //     display: inline-block;
    //     height: 1rem;
    //     width: 2rem;
    //     -webkit-appearance: none;
    //     -moz-appearance: none;
    //     appearance: none;
    //     border-radius: 9999px;
    //     border-width: 1px;
    //     border-style: solid;
    //     --border-opacity: 1;
    //     border-color: rgb(77 75 103 / var(--border-opacity));
    //     --bg-opacity: 1;
    //     background-color: rgb(15 31 45 / var(--bg-opacity));
    //     background-image: none;
    //     padding: 0px;
    //     --text-opacity: 1;
    //     color: rgb(242 253 255 / var(--text-opacity));
    //     outline: 2px solid transparent;
    //     outline-offset: 2px;
    //     cursor: url(../../../../../public/static/images/cursor_pointer.png), pointer;
    // }

    // .input-switch::before {
    //     position: absolute;
    //     left: -3px;
    //     top: -3px;
    //     height: 1.25rem;
    //     width: 1.25rem;
    //     border-radius: 9999px;
    //     --bg-opacity: 1;
    //     background-color: rgb(146 142 187 / var(--bg-opacity));
    //     transition-property: all;
    //     transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    //     transition-duration: 150ms;
    //     --content: "";
    //     content: var(--content);
    // }

    // .input-switch:checked {
    //     --border-opacity: 1;
    //     border-color: rgb(146 142 187 / var(--border-opacity));
    // }

    // .input-switch:checked::before {
    //     left: 13px;
    //     top: -3px;
    //     --bg-opacity: 1;
    //     background-color: rgb(65 86 246 / var(--bg-opacity));
    //     content: var(--content);
    //     /*--shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
    //     --shadow-colored: 0 0 7px 0 var(--shadow-color);
    //     box-shadow: var(--ring-offset-shadow, 0 0 #0000), var(--ring-shadow, 0 0 #0000), var(--shadow);*/
    // }

    // .input-switch:disabled {
    //     cursor: not-allowed;
    //     opacity: 0.4;
    // }
</style>
