<script lang="ts">
    import { onMount } from "svelte";
    import type { JitsiRoomConfigData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import PopUpContainer from "../../PopUp/PopUpContainer.svelte";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import Button from "../../UI/Button.svelte";
    import { modals } from "@wa-modals";

    let defaultConfig: JitsiRoomConfigData = {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
    };

    type JitsiRoomConfigDataKeys = "startWithAudioMuted" | "startWithVideoMuted";

    const defaultConfigKeys: JitsiRoomConfigDataKeys[] = Object.keys(defaultConfig).map(
        (key) => key as JitsiRoomConfigDataKeys,
    );

    interface Props {
        isOpen: boolean;
        onsave: (config: JitsiRoomConfigData & { jitsiRoomAdminTag: string }) => void;
        onclose?: () => void;
        visibilityValue: boolean;
        config: JitsiRoomConfigData;
        jitsiRoomAdminTag: string;
    }

    let {
        isOpen,
        onsave,
        onclose,
        visibilityValue = $bindable<boolean>(),
        config,
        jitsiRoomAdminTag = $bindable<string>(),
    }: Props = $props();

    if (jitsiRoomAdminTag === undefined) {
        jitsiRoomAdminTag = "";
    }

    let currentConfig: JitsiRoomConfigData = $state({});

    onMount(() => {
        currentConfig = {};
        if (config !== undefined) {
            currentConfig = $state.snapshot(config);
        }
    });

    function close() {
        visibilityValue = false;
        modals.close();
        onclose?.();
    }

    function saveAndClose() {
        onsave({ ...$state.snapshot(currentConfig), jitsiRoomAdminTag });
        close();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }
</script>

<svelte:window onkeydown={onKeyDown} />
{#if isOpen}
    <div class="absolute flex items-center justify-center w-full h-full">
        <div
            class="backdrop-blur-md text-white z-[2001] w-[90%] m-auto left-0 right-0 sm:max-w-[668px] rounded-3xl max-h-full overflow-y-auto pointer-events-auto"
        >
            <PopUpContainer fullContent={true}>
                <div class="flex items-center justify-between">
                    <span class="font-bold text-xl pl-4">
                        {$LL.mapEditor.properties.jitsiRoomProperty.moreOptionsLabel()}
                    </span>
                    <ButtonClose onclick={close} />
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
                                    label={$LL.mapEditor.properties.jitsiRoomProperty.jitsiRoomConfig[configKey]()}
                                />
                            {/if}
                        </div>
                    {/each}
                    <div class="config-element mt-4">
                        <Input
                            id="jitsiAdminTag"
                            label={$LL.mapEditor.properties.jitsiRoomProperty.jitsiRoomConfig.jitsiRoomAdminTag()}
                            type="text"
                            bind:value={jitsiRoomAdminTag}
                        />
                    </div>
                </div>

                {#snippet buttons()}
                    <div class="w-full flex justify-between gap-2 p-2">
                        <Button variant="light" appearance="border" class="w-full h-12" onclick={() => modals.close()}>
                            {$LL.mapEditor.properties.jitsiRoomProperty.jitsiRoomConfig.cancel()}
                        </Button>
                        <Button variant="secondary" class="w-full h-12" onclick={saveAndClose}>
                            {$LL.mapEditor.properties.jitsiRoomProperty.jitsiRoomConfig.validate()}
                        </Button>
                    </div>
                {/snippet}
            </PopUpContainer>
        </div>
    </div>
{/if}

<style>
    .config-element-container {
        overflow-y: auto;
        overflow-x: hidden;
        .config-element {
            display: flex;
            flex-direction: row;
            height: 2.5em;

            input[type="text"] {
                margin-top: 0.25em;
                margin-bottom: 0.25em;
                padding-top: 0.25em;
                padding-bottom: 0.25em;
            }
        }
    }
</style>
