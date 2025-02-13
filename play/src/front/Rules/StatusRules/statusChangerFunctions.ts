import { requestedStatusStore } from "../../Stores/MediaStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { popupStore } from "../../Stores/PopupStore";
import BubbleConfirmationModal from "../../Components/ActionBar/AvailabilityStatus/Modals/BubbleConfirmationModal.svelte";
import ChangeStatusConfirmationModal from "../../Components/ActionBar/AvailabilityStatus/Modals/ChangeStatusConfirmationModal.svelte";
import { RequestedStatus } from "./statusRules";

export const askToChangeStatus = () => {
    popupStore.addPopup(ChangeStatusConfirmationModal, {}, "changeStatusConfirmationModal");
};

export const closeChangeStatusConfirmationModal = () => {
    popupStore.removePopup("changeStatusConfirmationModal");
};

export const hideBubbleConfirmationModal = () => {
    closeBubbleConfirmationModal();
};

export const resetAllStatusStoreExcept = (status: RequestedStatus | null = null) => {
    requestedStatusStore.set(status);
    localUserStore.setRequestedStatus(status);
};

export const passStatusToOnline = () => {
    resetAllStatusStoreExcept();
    closeChangeStatusConfirmationModal();
    closeBubbleConfirmationModal();
};

export const closeBubbleConfirmationModal = () => {
    popupStore.removePopup("bubbleConfirmationModal");
};

export const askIfUserWantToJoinBubbleOf = (name: string) => {
    popupStore.addPopup(
        BubbleConfirmationModal,
        {
            name,
        },
        "bubbleConfirmationModal"
    );
};
