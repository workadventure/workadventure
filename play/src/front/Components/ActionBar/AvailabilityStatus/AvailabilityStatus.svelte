<script lang="ts">
    import { onDestroy } from "svelte";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { availabilityStatusMenuStore } from "../../../Stores/AvailabilityStatusMenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { getColorHexOfStatus, getStatusInformation } from "../../../Utils/AvailabilityStatus";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import { StatusChangerStore } from "../../../Stores/statusChangerStore";
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
        AvailabilityStatus.DO_NOT_DISTURB,
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

    const toggleStatusPicker = (): void => {
        if ($availabilityStatusMenuStore == true) {
            availabilityStatusMenuStore.closeAvailabilityStatusMenu();
        } else {
            availabilityStatusMenuStore.openAvailabilityStatusMenu();
        }
    };

    const unsubcribeToAvailabilityStatusStore = availabilityStatusStore.subscribe((newStatus: AvailabilityStatus) => {
        $StatusChangerStore.changeStatusTo(newStatus);
        buttonProps.statusColorHex = getColorHexOfStatus($availabilityStatusStore);
    });

    onDestroy(() => {
        unsubcribeToAvailabilityStatusStore();
    });
</script>

<div on:click={toggleStatusPicker} class="bottom-action-button tw-w-full tw-overflow-ellipsis tw-max-w-24">
    <AvailabilityStatusButton props={buttonProps} />
    {#if $availabilityStatusMenuStore}
        <AvailabilityStatusList props={listProps} />
    {/if}
</div>
