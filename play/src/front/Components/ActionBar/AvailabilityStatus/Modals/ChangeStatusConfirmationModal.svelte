<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import { changeStatusConfirmationModalVisibility } from "../../../../Stores/AvailabilityStatusModalsStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            changeStatusConfirmationModalVisibility.close();
        },
        handleClose: () => {
            changeStatusConfirmationModalVisibility.close();
        },
        acceptLabel: $LL.statusModal.confirm(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div class="tw-grow tw-text-center tw-text-xl">{$LL.statusModal.goBackToOnlineStatusLabel()}</div>
</ConfirmationModal>
