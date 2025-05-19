<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { resetAllStatusStoreExcept } from "../../../Rules/StatusRules/statusChangerFunctions";
    import { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
    import CheckIcon from "../../Icons/CheckIcon.svelte";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import { getColorHexOfStatus, getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import LL from "../../../../i18n/i18n-svelte";
    import ExternalComponents from "../../ExternalModules/ExternalComponents.svelte";
    import HeaderMenuItem from "../MenuIcons/HeaderMenuItem.svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { StatusInformationInterface } from "./Interfaces/AvailabilityStatusPropsInterface";
    import AvailabilityStatusCircle from "./AvailabilityStatusCircle.svelte";

    export let statusInformation: Array<StatusInformationInterface>;
    export let align: "end" | "start" = "start";

    const handleKeyPress = (e: KeyboardEvent, newStatus: RequestedStatus | AvailabilityStatus.ONLINE | null) => {
        if (newStatus === AvailabilityStatus.ONLINE) newStatus = null;
        if (e.key === "Enter") {
            resetAllStatusStoreExcept(newStatus);
            openedMenuStore.close("profileMenu");
        }
    };
    const handleClick = (newStatus: RequestedStatus | AvailabilityStatus.ONLINE | null) => {
        if (newStatus === AvailabilityStatus.ONLINE) newStatus = null;
        resetAllStatusStoreExcept(newStatus);
        openedMenuStore.close("profileMenu");
    };
</script>

<div>
    <ExternalComponents zone="availabilityStatus" />

    <HeaderMenuItem label={$LL.actionbar.listStatusTitle.enable()} />
    <!-- Some status (silent, in a meeting...) are locking the status bar to only one option -->
    {#if [AvailabilityStatus.SPEAKER, AvailabilityStatus.JITSI, AvailabilityStatus.BBB, AvailabilityStatus.DENY_PROXIMITY_MEETING, AvailabilityStatus.SILENT].includes($availabilityStatusStore)}
        <button
            class="status-button group flex px-2 py-1 gap-2 items-center transition-all cursor-pointer text-sm text-neutral-100 w-full pointer-events-auto text-start rounded active:outline-none focus:outline-none"
        >
            <AvailabilityStatusCircle
                cursorType="pointer"
                position="relative"
                colorHex={getColorHexOfStatus($availabilityStatusStore)}
            />
            <div class="grow text-start leading-4 opacity-50">{getStatusLabel($availabilityStatusStore)}</div>
            <CheckIcon height="h-4" width="h-4" classList="transition-all" />
        </button>
    {:else}
        {#each statusInformation as statusInformationValue (statusInformationValue.AvailabilityStatus)}
            <button
                class="status-button group flex px-2 py-1 gap-2 items-center transition-all cursor-pointer text-sm text-neutral-100 w-full pointer-events-auto text-start rounded active:outline-none focus:outline-none"
                class:justify-end={align === "end"}
                class:disabled={$availabilityStatusStore === statusInformationValue.AvailabilityStatus}
                on:keyup={(e) => {
                    handleKeyPress(e, statusInformationValue.AvailabilityStatus);
                }}
                on:click|stopPropagation={() => handleClick(statusInformationValue.AvailabilityStatus)}
            >
                <AvailabilityStatusCircle
                    cursorType="pointer"
                    position="relative"
                    colorHex={statusInformationValue.colorHex}
                    isActive={$availabilityStatusStore === statusInformationValue.AvailabilityStatus}
                />
                <div
                    class="text-start leading-4"
                    class:grow={align === "start"}
                    class:opacity-50={$availabilityStatusStore === statusInformationValue.AvailabilityStatus}
                >
                    {statusInformationValue.label}
                </div>
                <CheckIcon
                    height="h-4"
                    width="h-4"
                    classList={($availabilityStatusStore !== statusInformationValue.AvailabilityStatus
                        ? "opacity-0 "
                        : "") + "group-hover:opacity-100 transition-all"}
                />
            </button>
        {/each}
    {/if}
</div>
