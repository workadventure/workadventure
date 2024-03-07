<script lang="ts">
    import { onDestroy } from "svelte";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { availabilityStatusMenuStore } from "../../../Stores/AvailabilityStatusMenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { getColorHexOfStatus, getStatusInformation } from "../../../Utils/AvailabilityStatus";
    import { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { statusChanger } from "./statusChanger";
    import AvailabilityStatusList from "./AvailabilityStatusList.svelte";
    import AvailabilityStatusButton from "./AvailabilityStatusButton.svelte";
    import {
        AvailabilityStatusPropsInterface,
        AvailabilityStatusListPropsInterface,
    } from "./Interfaces/AvailabilityStatusPropsInterface";

    const statusToShow: Array<RequestedStatus | AvailabilityStatus.ONLINE> = [
        AvailabilityStatus.ONLINE,
        AvailabilityStatus.BUSY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.DO_NOT_DISTURB,
    ];

    const statusButtonTooltipText = (): string => {
        if (
            [
                AvailabilityStatus.SPEAKER,
                AvailabilityStatus.JITSI,
                AvailabilityStatus.BBB,
                AvailabilityStatus.DENY_PROXIMITY_MEETING,
            ].includes($availabilityStatusStore)
        )
            return $LL.actionbar.listStatusTitle.inMeeting();

        if ([AvailabilityStatus.SILENT].includes($availabilityStatusStore))
            return $LL.actionbar.listStatusTitle.inSilentZone();
        return $LL.actionbar.listStatusTitle.enable();
    };

    let listProps: AvailabilityStatusListPropsInterface = {
        currentStatus: $availabilityStatusStore,
        listStatusTitle: $LL.actionbar.listStatusTitle.enable(),
        statusInformations: getStatusInformation(statusToShow),
    };

    let buttonProps: AvailabilityStatusPropsInterface = {
        currentPlayerName: localUserStore.getName() || "",
        listStatusTitle: statusButtonTooltipText(),
        menuVisibility: $menuVisiblilityStore,
        statusColorHex: getColorHexOfStatus($availabilityStatusStore),
    };

    const toggleStatusPicker = (): void => {
        if ($availabilityStatusMenuStore == true) {
            availabilityStatusMenuStore.closeAvailabilityStatusMenu();
        } else {
            availabilityStatusMenuStore.openAvailabilityStatusMenu();
        }
    };

    const unsubcribeToAvailabilityStatusStore = availabilityStatusStore.subscribe((newStatus: AvailabilityStatus) => {
        console.log(AvailabilityStatus[newStatus], statusButtonTooltipText());
        statusChanger.changeStatusTo(newStatus);
        buttonProps = {
            ...buttonProps,
            statusColorHex: getColorHexOfStatus($availabilityStatusStore),
            listStatusTitle: statusButtonTooltipText(),
        };
        listProps = {
            ...listProps,
            currentStatus: $availabilityStatusStore,
        };
    });

    onDestroy(() => {
        unsubcribeToAvailabilityStatusStore();
    });
</script>

<div
    id="AvailabilityStatus"
    on:click|stopPropagation={toggleStatusPicker}
    class="bottom-action-button tw-w-full tw-overflow-ellipsis tw-max-w-24"
>
    <AvailabilityStatusButton props={buttonProps} />
    {#if $availabilityStatusMenuStore}
        <AvailabilityStatusList props={listProps} />
    {/if}
</div>
