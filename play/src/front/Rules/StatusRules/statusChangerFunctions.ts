import { get } from "svelte/store";
import {
    bubbleModalVisibility,
    changeStatusConfirmationModalVisibility,
} from "../../Stores/AvailabilityStatusModalsStore";
import { requestedStatusStore } from "../../Stores/MediaStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { RequestedStatus } from "./statusRules";

export const askToChangeStatus = () => {
    changeStatusConfirmationModalVisibility.open();
};
export const hideBubbleConfirmationModal = () => {
    bubbleModalVisibility.close();
};

export const resetAllStatusStoreExcept = (status: RequestedStatus | null = null) => {
    if (get(requestedStatusStore) === status) return;
    requestedStatusStore.set(status);
    localUserStore.setRequestedStatus(status);
};

export const passStatusToOnline = () => {
    resetAllStatusStoreExcept();
    changeStatusConfirmationModalVisibility.close();
    bubbleModalVisibility.close();
};

export const askIfUserWantToJoinBubbleOf = (name: string) => {
    bubbleModalVisibility.open(name);
};
