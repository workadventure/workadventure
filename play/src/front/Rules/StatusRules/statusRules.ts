import type { AvailabilityStatus } from "@workadventure/messages";

export type TimedRules = {
    applyIn: number;
    rule: () => void;
};

export type RequestedStatus =
    | AvailabilityStatus.DO_NOT_DISTURB
    | AvailabilityStatus.BACK_IN_A_MOMENT
    | AvailabilityStatus.BUSY;
