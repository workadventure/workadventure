import { AvailabilityStatus } from "@workadventure/messages";
import { RequestedStatus } from "../statusRules";

export const requestedStatusFactory = {
    createRequestedStatus(newStatus: string | null): RequestedStatus | null {
        switch (parseInt(newStatus || "")) {
            case AvailabilityStatus.BUSY:
                return AvailabilityStatus.BUSY;
            case AvailabilityStatus.DO_NOT_DISTURB:
                return AvailabilityStatus.DO_NOT_DISTURB;
            case AvailabilityStatus.BACK_IN_A_MOMENT:
                return AvailabilityStatus.BACK_IN_A_MOMENT;
            default:
                return null;
        }
    },
};
