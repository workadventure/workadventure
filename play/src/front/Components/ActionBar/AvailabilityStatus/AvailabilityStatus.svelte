<script lang="ts">
    import { onDestroy } from "svelte";
    import * as Sentry from "@sentry/svelte";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { availabilityStatusMenuStore } from "../../../Stores/AvailabilityStatusMenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { getColorHexOfStatus, getStatusInformation } from "../../../Utils/AvailabilityStatus";
    import { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
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
        statusInformation: getStatusInformation(statusToShow),
    };

    let buttonProps: AvailabilityStatusPropsInterface = {
        currentPlayerName: gameManager.getPlayerName() || "",
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
        try {
            statusChanger.changeStatusTo(newStatus);
        } catch (e) {
            console.error("Error while changing status", e);
            Sentry.captureException(e);
        }
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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    id="AvailabilityStatus"
    on:click|stopPropagation={toggleStatusPicker}
    class="bottom-action-button w-full overflow-ellipsis max-w-24"
>
    <AvailabilityStatusButton props={buttonProps} />
    {#if $availabilityStatusMenuStore}
        <AvailabilityStatusList props={listProps} />
    {/if}
</div>
