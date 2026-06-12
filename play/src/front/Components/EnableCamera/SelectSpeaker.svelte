<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import Chip from "../UI/Chip.svelte";
    import { IconCheck, IconUnMute } from "@wa-icons";

    let editMode = $state(false);

    interface Props {
        selectedDevice?: string;
        deviceList: MediaDeviceInfo[];
        onplaysound?: (deviceId: string | undefined) => void;
        onselectdevice?: (deviceId: string | undefined) => void;
    }

    let { selectedDevice = undefined, deviceList, onplaysound, onselectdevice }: Props = $props();
</script>

<div
    class="px-4 pt-4 pb-2 rounded-lg bg-white/10 mt-4 mx-2 md:mx-0 w-full min-w-[300px] md:min-w-[400px] max-w-[450px] flex flex-col lg:min-h-[24rem] items-center"
>
    <div class="text-lg bold flex items-center justify-center space-x-3 mb-2 ps-2">
        <IconUnMute font-size="28" />
        <div class="grow pe-8 ps-2">{$LL.camera.editSpeaker()}</div>
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

    <div class="flex items-center justify-center w-full">
        <div class="flex flex-wrap items-center justify-center min-h-[129px] w-full">
            {#each deviceList as speaker, index (index)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="border border-solid border-white w-full rounded-lg m-2 items-center justify-between transition-all overflow-hidden cursor-pointer relative px-8 py-6 space-x-4 {selectedDevice ===
                    speaker.deviceId
                        ? 'bg-white text-secondary border-none'
                        : 'border-white hover:bg-white/10'}"
                    class:flex={editMode || selectedDevice === speaker.deviceId}
                    class:hidden={!editMode && selectedDevice !== speaker.deviceId}
                    onclick={() => {
                        onselectdevice?.(speaker.deviceId);
                        onplaysound?.(speaker.deviceId);
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
                                <IconCheck class="text-white" />
                            {/if}
                        </div>
                        <div class="space-y-1 min-w-0">
                            <div class="text-lg bold truncate leading-tight">
                                {StringUtils.normalizeDeviceName(speaker.label)}
                            </div>
                            {#if selectedDevice === speaker.deviceId}
                                <Chip>{$LL.camera.active()}</Chip>
                            {:else}
                                <Chip>{$LL.camera.notRecommended()}</Chip>
                            {/if}
                        </div>
                    </div>
                    {#if selectedDevice === speaker.deviceId}
                        <button class="btn btn-secondary self-end" type="button">
                            <!-- TODO HUGO -->
                            <IconUnMute font-size="20" />
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
