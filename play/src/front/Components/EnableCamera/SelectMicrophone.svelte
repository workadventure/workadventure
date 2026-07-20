<script lang="ts">
    import type { Snippet } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import Chip from "../UI/Chip.svelte";
    import Button from "../UI/Button.svelte";
    import { IconMicrophoneOff, IconCheck } from "@wa-icons";

    let editMode = $state(false);
    interface Props {
        selectedDevice?: string;
        deviceList: MediaDeviceInfo[];
        onselectdevice?: (deviceId: string | undefined) => void;
        icon?: Snippet;
        title?: Snippet;
        widget?: Snippet;
    }

    let { selectedDevice = undefined, deviceList, onselectdevice, icon, title, widget }: Props = $props();
</script>

<div
    class="p-4 rounded-lg bg-white/10 mx-2 md:mx-0 w-full min-w-[300px] md:min-w-[400px] max-w-[450px] flex flex-col lg:min-h-[24rem] items-center"
>
    <div class="text-lg bold flex items-center gap-3 mb-4 ps-2">
        {@render icon?.()}
        <div class="grow pe-8 ps-2">
            {@render title?.()}
        </div>
        <Button
            variant={!editMode ? "secondary" : "light"}
            appearance={!editMode ? "filled" : "ghost"}
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                editMode = !editMode;
            }}
        >
            {!editMode ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
        </Button>
    </div>

    <div class="flex w-full">
        <div class="flex flex-wrap justify-center w-full min-h-[129px]">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="flex border border-solid border-white w-full rounded-lg items-center justify-start transition-all overflow-hidden cursor-pointer px-8 py-6 space-x-4 {!selectedDevice
                    ? 'bg-white text-secondary border-none'
                    : ' hover:bg-white/10 pt-4'} "
                class:hidden={!editMode && selectedDevice}
                class:flex={editMode || !selectedDevice}
                onclick={() => {
                    onselectdevice?.(undefined);
                    editMode = false;
                }}
            >
                <div
                    class="aspect-square me-4 h-6 rounded-full border border-solid border-white flex items-center justify-center"
                    class:bg-secondary={!selectedDevice}
                    class:border-secondary={!selectedDevice}
                >
                    {#if !selectedDevice}
                        <IconCheck font-size="20" class="text-white" />
                    {/if}
                </div>

                <div class="space-y-1 min-w-0">
                    <div class="text-lg bold truncate leading-tight flex self-start">
                        {#if editMode && selectedDevice}
                            <IconMicrophoneOff font-size="20" />
                        {/if}

                        {$LL.audio.disable()}
                    </div>
                    {#if !selectedDevice}
                        <Chip>{$LL.camera.active()}</Chip>
                    {:else}
                        <Chip>{$LL.camera.notRecommended()}</Chip>
                    {/if}
                </div>
            </div>
            {#each deviceList ?? [] as device (device.deviceId)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="border border-solid border-white w-full rounded-lg transition-all overflow-hidden cursor-pointer relative px-8 py-6 space-x-4 {selectedDevice ===
                    device.deviceId
                        ? 'bg-white text-secondary pt-12'
                        : 'hover:bg-white/10 pt-4'}"
                    class:hidden={!editMode && selectedDevice !== device.deviceId}
                    class:flex={editMode || selectedDevice === device.deviceId}
                    onclick={() => {
                        onselectdevice?.(device.deviceId);
                        editMode = false;
                    }}
                >
                    {#if device.deviceId === selectedDevice}
                        {@render widget?.()}
                    {/if}
                    <div class="flex gap-4 items-center justify-start w-full">
                        <div
                            class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center"
                            class:bg-secondary={selectedDevice === device.deviceId}
                            class:border-secondary={selectedDevice === device.deviceId}
                        >
                            {#if selectedDevice == device.deviceId}
                                <IconCheck class="text-white" />
                            {/if}
                        </div>
                        <div class="space-y-1 min-w-0">
                            <div class="text-lg bold truncate leading-tight">
                                {StringUtils.normalizeDeviceName(device.label)}
                            </div>
                            {#if device.deviceId === selectedDevice}
                                <Chip>{$LL.camera.active()}</Chip>
                            {:else}
                                <Chip>{$LL.camera.disabled()}</Chip>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
