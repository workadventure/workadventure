import { AvailabilityStatus } from "@workadventure/messages";
import { statusChanger } from "../../Components/ActionBar/AvailabilityStatus/statusChanger";
import { resetAllStatusStoreExcept } from "./statusChangerFunctions";

export const ExtensionModuleStatusSynchronization = {
    onStatusChange: (status: AvailabilityStatus) => {
        if (statusChanger.getActualStatus() === status) {
            return;
        }
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
