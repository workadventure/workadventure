import { get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    bubbleModalVisibility,
    changeStatusConfirmationModalVisibility,
} from "../../Stores/AvailabilityStatusModalsStore";
import { availabilityStatusStore, backInAMomentStore, busyStore, doNotDisturbStore } from "../../Stores/MediaStore";
import { setableStatus } from "./statusRules";

export const askToChangeStatus = () => {
    changeStatusConfirmationModalVisibility.open();
};
export const hideBubbleConfirmationModal = () => {
    bubbleModalVisibility.close();
};

export const resetAllStatusStoreExcept = (status?: AvailabilityStatus) => {
    doNotDisturbStore.set(status === AvailabilityStatus.DO_NOT_DISTURB);
    backInAMomentStore.set(status === AvailabilityStatus.BACK_IN_A_MOMENT);
    busyStore.set(status === AvailabilityStatus.BUSY);
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
