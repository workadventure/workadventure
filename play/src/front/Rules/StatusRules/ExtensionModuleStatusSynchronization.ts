import { AvailabilityStatus } from "@workadventure/messages";
import { resetAllStatusStoreExcept } from "./statusChangerFunctions";

export const ExtensionModuleStatusSynchronization = {
    onStatusChange: (status: AvailabilityStatus) => {
        if (
            status === AvailabilityStatus.BUSY ||
            status === AvailabilityStatus.BACK_IN_A_MOMENT ||
            status === AvailabilityStatus.DO_NOT_DISTURB
        ) {
            resetAllStatusStoreExcept(status);
        }
        if (status === AvailabilityStatus.ONLINE || status === AvailabilityStatus.AWAY) {
            resetAllStatusStoreExcept(null);
        }
    },
};
