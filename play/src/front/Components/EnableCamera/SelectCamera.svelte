<script lang="ts">
    import type { Snippet } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import Chip from "../UI/Chip.svelte";
    import { IconCheck, IconVideoOff } from "@wa-icons";

    let editMode = $state(false);
    interface Props {
        selectedDevice?: string | undefined;
        deviceList: MediaDeviceInfo[];
        onselectdevice?: (deviceId: string | undefined) => void;
        icon?: Snippet;
        title?: Snippet;
        widget?: Snippet;
    }

    let { selectedDevice = undefined, deviceList, onselectdevice, icon, title, widget }: Props = $props();
</script>

<div
    class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 w-full mx-2 md:mx-0 min-w-[280px] md:min-w-[400px] max-w-[450px] flex flex-col lg:min-h-[24rem] items-center"
>
    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 ps-2">
        {@render icon?.()}
        <div class="grow pe-8 ps-2">
            {@render title?.()}
        </div>
        <button
            class="btn {!editMode ? 'btn-secondary' : 'btn-light btn-ghost'}"
            onclick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                editMode = !editMode;
            }}
        >
            {!editMode ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
        </button>
    </div>
    <div class="flex items-center justify-center">
        <div class="flex flex-wrap items-center justify-center min-h-[129px]">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="border border-solid border-white w-full rounded-lg m-2 items-center justify-start transition-all overflow-hidden cursor-pointer relative px-8 py-6 space-x-4 {!selectedDevice
                    ? 'bg-white text-secondary border-none'
                    : 'hover:bg-white/10'}"
                class:hidden={!editMode && selectedDevice}
                class:flex,flex-col={editMode || !selectedDevice}
                onclick={() => {
                    onselectdevice?.(undefined);
                    editMode = false;
                }}
            >
                {#if !editMode && !selectedDevice}
                    <div
                        class="webrtcsetup flex items-center justify-center h-[200px] w-full aspect-video overflow-hidden bg-contrast"
                    >
                        <IconVideoOff font-size="28" />
                    </div>
                {/if}
                <div class="flex py-4 pe-8 ps-4 items-center space-x-4">
                    <div
                        class="aspect-square me-4 h-6 rounded-full border border-solid border-white flex items-center justify-center"
                        class:bg-secondary={!selectedDevice}
                        class:border-secondary={!selectedDevice}
                    >
                        {#if !selectedDevice}
                            <IconCheck class="text-white" />
                        {/if}
                    </div>
                    <div class="space-y-1">
                        <div class="text-lg bold max-w-[241px] truncate text-ellipsis overflow-hidden leading-tight">
                            {$LL.camera.disable()}
                        </div>
                        {#if !selectedDevice}
                            <Chip>{$LL.camera.active()}</Chip>
                        {:else}
                            <Chip>{$LL.camera.notRecommended()}</Chip>
                        {/if}
                    </div>
                </div>
            </div>
            {#each deviceList ?? [] as device (device.deviceId)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="border border-solid w-full rounded-lg relative justify-start m-2 space-x-4 transition-all overflow-hidden cursor-pointer {selectedDevice ===
                    device.deviceId
                        ? 'bg-white text-secondary border-none '
                        : 'border-white hover:bg-white/10'}"
                    class:hidden={!editMode && selectedDevice !== device.deviceId}
                    class:flex,flex-col={editMode || selectedDevice === device.deviceId}
                    onclick={() => {
                        onselectdevice?.(device.deviceId);
                        editMode = false;
                    }}
                >
                    {#if !editMode && device.deviceId === selectedDevice}
                        <div class="top-0 left-0 w-full">
                            {@render widget?.()}
                        </div>
                    {/if}
                    <div class="flex py-4 pe-8 ps-4 items-center space-x-4">
                        <div
                            class="aspect-square me-4 h-6 rounded-full border border-solid border-white flex items-center justify-center"
                            class:bg-secondary={selectedDevice === device.deviceId}
                            class:border-secondary={selectedDevice === device.deviceId}
                        >
                            {#if selectedDevice == device.deviceId}
                                <IconCheck class="text-white" />
                            {/if}
                        </div>
                        <div class="space-y-1">
                            <div
                                class="text-lg bold truncate leading-tight"
                                style:width={!editMode && selectedDevice === device.deviceId ? "251px" : "auto"}
                            >
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
