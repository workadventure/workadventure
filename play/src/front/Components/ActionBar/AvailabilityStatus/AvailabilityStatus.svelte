<script lang="ts">
    import { availabilityStatusMenuStore } from "../../../Stores/AvailabilityStatusMenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { AvailabilityStatus } from "../../../../../../libs/messages";
    import { menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { getColorHexOfStatus, getStatusInformation } from "../../../Utils/AvailabilityStatus";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import AvailabilityStatusList from "./AvailabilityStatusList.svelte";
    import AvailabilityStatusButton from "./AvailabilityStatusButton.svelte";
    import {
        AvailabilityStatusPropsInterface,
        AvailabilityStatusListPropsInterface,
    } from "./Interfaces/AvailabilityStatusPropsInterface";

    const statusToShow = [
        AvailabilityStatus.ONLINE,
        AvailabilityStatus.BUSY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.DO_NOT_DISTRUB,
    ];

    const listProps: AvailabilityStatusListPropsInterface = {
        currentStatus: $availabilityStatusStore,
        listStatusTitle: $LL.actionbar.listStatusTitle(),
        statusInformations: getStatusInformation(statusToShow),
    };

    const buttonProps: AvailabilityStatusPropsInterface = {
        currentPlayerName: localStorage.getItem("playerName") || "",
        listStatusTitle: $LL.actionbar.listStatusTitle(),
        menuVisibility: $menuVisiblilityStore,
        statusColorHex: getColorHexOfStatus($availabilityStatusStore || AvailabilityStatus.ONLINE),
    };

    const noDrag = (): boolean => {
        return false;
    };

    const toggleStatusPicker = (): void => {
        if ($availabilityStatusMenuStore == true) {
            availabilityStatusMenuStore.closeAvailabilityStatusMenu();
        } else {
            availabilityStatusMenuStore.openAvailabilityStatusMenu();
        }
    };
</script>

<div
    on:dragstart|preventDefault={noDrag}
    on:click={toggleStatusPicker}
    class="bottom-action-button tw-w-full tw-overflow-ellipsis tw-max-w-24"
>
    <AvailabilityStatusButton props={buttonProps} />
    {#if $availabilityStatusMenuStore}
        <AvailabilityStatusList props={listProps} />
    {/if}
</div>
