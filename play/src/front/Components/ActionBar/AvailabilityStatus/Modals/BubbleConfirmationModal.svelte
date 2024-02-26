<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import {
        bubbleModalVisibility,
        namePlayerInBubbleModalStore,
    } from "../../../../Stores/AvailabilityStatusModalsStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import { passStatusToOnlineWhenUserIsInSetableStatus } from "../../../../Rules/StatusRules/statusChangerFunctions";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            passStatusToOnlineWhenUserIsInSetableStatus();
            bubbleModalVisibility.close();
        },
        handleClose: () => {
            bubbleModalVisibility.close();
        },
        acceptLabel: $LL.statusModal.accept(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div class="tw-grow tw-text-center tw-text-xl ">
        {`${$namePlayerInBubbleModalStore} `}{$LL.notification.discussion()}
    </div>
</ConfirmationModal>
