<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import VolumeIcon from "../Icons/VolumeIcon.svelte";
    let editMode = false;
    export let selectedDevice: string | undefined = undefined;
    export let deviceList: MediaDeviceInfo[];
    const dispatch = createEventDispatcher<{
        selectDevice: string | undefined;
        playSound: string | undefined;
    }>();
</script>

<div
    class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 mx-2 md:mx-0 w-full min-w-[300px] md:min-w-[400px] max-w-[450px] flex flex-col lg:min-h-[24rem] items-center"
>
    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 ps-2">
        <VolumeIcon height="h-8" width="w-8" />
        <div class="grow pe-8 ps-2">{$LL.camera.editSpeaker()}</div>
        <button
            class="btn {!editMode ? 'btn-secondary' : 'btn-light btn-ghost'}"
            on:click|stopPropagation|preventDefault={() => (editMode = !editMode)}
        >
            {!editMode ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
        </button>
    </div>

    <div class="flex items-center justify-center w-full">
        <div class="flex flex-wrap items-center justify-center min-h-[129px] w-full">
            {#each deviceList as speaker, index (index)}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="border border-solid border-white w-full rounded-lg m-2  items-center justify-between transition-all overflow-hidden cursor-pointer relative px-8 py-6 space-x-4 {selectedDevice ===
                    speaker.deviceId
                        ? 'bg-white text-secondary border-none'
                        : 'border-white hover:bg-white/10'}"
                    class:flex={editMode || selectedDevice === speaker.deviceId}
                    class:hidden={!editMode && selectedDevice !== speaker.deviceId}
                    on:click={() => {
                        dispatch("selectDevice", speaker.deviceId);
                        dispatch("playSound", speaker.deviceId);
                        editMode = false;
                    }}
                >
                    <div class="flex items-center space-x-4 overflow-hidden truncate">
                        <div
                            class="aspect-square me-4 h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedDevice ===
                            speaker.deviceId
                                ? 'bg-secondary border-secondary'
                                : 'border-white'}"
                        >
                            {#if selectedDevice === speaker.deviceId}
                                <CheckIcon width="w-4" height="h-4" />
                            {/if}
                        </div>
                        <div class="space-y-1 min-w-0">
                            <div class="text-lg bold truncate leading-tight">
                                {StringUtils.normalizeDeviceName(speaker.label)}
                            </div>
                            {#if selectedDevice === speaker.deviceId}
                                <span class="chip chip-sm chip-neutral inline rounded-sm">
                                    <span class="chip-label">{$LL.camera.active()}</span>
                                </span>
                            {:else}
                                <span class="chip chip-sm chip-neutral inline rounded-sm">
                                    <span class="chip-label">{$LL.camera.notRecommended()}</span>
                                </span>
                            {/if}
                        </div>
                    </div>
                    {#if selectedDevice === speaker.deviceId}
                        <button class="btn btn-secondary self-end" type="button">
                            <!-- TODO HUGO -->
                            <VolumeIcon />
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
