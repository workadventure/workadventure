import { get } from "svelte/store";
import {
    bubbleModalVisibility,
    changeStatusConfirmationModalVisibility,
} from "../../Stores/AvailabilityStatusModalsStore";
import { availabilityStatusStore, requestedStatusStore } from "../../Stores/MediaStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { RequestedStatus, setableStatus } from "./statusRules";

export const askToChangeStatus = () => {
    changeStatusConfirmationModalVisibility.open();
};
export const hideBubbleConfirmationModal = () => {
    bubbleModalVisibility.close();
};

export const resetAllStatusStoreExcept = (status: RequestedStatus | null = null) => {
    requestedStatusStore.set(status);
    localUserStore.setRequestedStatus(status);
};

const isInSetableStatus = () => {
    return setableStatus.includes(get(availabilityStatusStore));
};

export const passStatusToOnlineWhenUserIsInSetableStatus = () => {
    if (!isInSetableStatus()) return;
    resetAllStatusStoreExcept();
    changeStatusConfirmationModalVisibility.close();
    bubbleModalVisibility.close();
};
export const askIfUserWantToJoinBubbleOf = (name: string) => {
    bubbleModalVisibility.open(name);
};
