<script lang="ts">
    import ConfirmationModal from "./ConfirmationModal.svelte";
    import { ConfirmationModalPropsInterface } from "./Interfaces/ConfirmationModalPropsInterface";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {},
        handleClose: () => {},
        acceptLabel: "Confirmer",
        closeLabel: "Fermer",
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div class="tw-grow tw-text-center tw-bg-amber-400">Test Label de la Modal ?</div>
</ConfirmationModal>
