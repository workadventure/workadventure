<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import LL from "../../../../../i18n/i18n-svelte";
    import {
        closeBubbleConfirmationModal,
        passStatusToOnline,
    } from "../../../../Rules/StatusRules/statusChangerFunctions";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    export let name: string;

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            passStatusToOnline();
            closeBubbleConfirmationModal();
        },
        handleClose: () => {
            closeBubbleConfirmationModal();
        },
        acceptLabel: $LL.statusModal.accept(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div id="acceptDiscussion" class="grow text-center text-xl">
        {$LL.notification.discussion({ name })}
    </div>
</ConfirmationModal>
