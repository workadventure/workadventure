<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import VolumeIcon from "../Icons/VolumeIcon.svelte";
    let editMode = false;
    export let selectedDevice: string | undefined = undefined;
    export let deviceList: MediaDeviceInfo[];
    const dispatch = createEventDispatcher();
</script>

<div
    class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 mx-2 md:mx-0 w-full max-w-[450px] flex flex-col lg:min-h-[24rem] items-center"
>
    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 pl-2">
        <VolumeIcon height="h-8" width="w-8" />
        <div class="grow pr-8">{$LL.camera.editSpeaker()}</div>
        <button
            class="btn {!editMode ? 'btn-secondary' : 'btn-light btn-ghost'}"
            on:click|stopPropagation|preventDefault={() => (editMode = !editMode)}
        >
            {!editMode ? $LL.actionbar.edit() : $LL.actionbar.cancel()}
        </button>
    </div>

    <div class="flex items-center justify-center">
        <div class="flex flex-wrap items-center justify-center min-h-[129px]">
            {#each deviceList as speaker, index (index)}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="border border-solid  rounded-lg relative items-center justify-start  m-2 space-x-4 transition-all overflow-hidden cursor-pointer px-6 py-6 {selectedDevice ===
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
                    <div
                        class="aspect-square h-6 rounded-full border border-solid border-white flex items-center justify-center {selectedDevice ===
                        speaker.deviceId
                            ? 'bg-secondary border-secondary'
                            : 'border-white'}"
                    >
                        {#if selectedDevice === speaker.deviceId}
                            <CheckIcon width="w-4" height="h-4" />
                        {/if}
                    </div>
                    <div class="space-y-1">
                        <div class="text-lg bold max-w-[177px] truncate text-ellipsis overflow-hidden leading-tight">
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
                    {#if selectedDevice === speaker.deviceId}
                        <button class="btn btn-secondary" type="button">
                            <!-- TODO HUGO -->
                            <VolumeIcon />
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
