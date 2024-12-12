<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import LL from "../../../../../i18n/i18n-svelte";
    import {
        closeChangeStatusConfirmationModal,
        resetAllStatusStoreExcept,
    } from "../../../../Rules/StatusRules/statusChangerFunctions";
    import { statusChanger } from "../statusChanger";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            resetAllStatusStoreExcept();
            closeChangeStatusConfirmationModal();
        },
        handleClose: () => {
            statusChanger.applyTimedRules();
            closeChangeStatusConfirmationModal();
        },
        acceptLabel: $LL.statusModal.confirm(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div class="grow text-center text-xl">{$LL.statusModal.goBackToOnlineStatusLabel()}</div>
</ConfirmationModal>
