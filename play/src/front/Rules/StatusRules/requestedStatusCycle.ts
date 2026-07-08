import { AvailabilityStatus } from "@workadventure/messages";
import type { RequestedStatus } from "./statusRules";

// Cycle order matches the ProfileMenu status list (ONLINE -> BUSY -> BACK_IN_A_MOMENT -> DO_NOT_DISTURB).
// Kept as a local copy to avoid touching the ProfileMenu component in this PR; unifying with
// `statusToShow` can be done as a follow-up.
export const requestedStatusCycle: ReadonlyArray<RequestedStatus | null> = [
    null,
    AvailabilityStatus.BUSY,
    AvailabilityStatus.BACK_IN_A_MOMENT,
    AvailabilityStatus.DO_NOT_DISTURB,
];

export const getNextRequestedStatus = (current: RequestedStatus | null): RequestedStatus | null => {
    const currentIndex = requestedStatusCycle.findIndex((status) => status === current);
    const nextIndex = (currentIndex + 1) % requestedStatusCycle.length;
    return requestedStatusCycle[nextIndex];
};
