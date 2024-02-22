import { AvailabilityStatus } from "../../../../../libs/messages";

export const statusRules = {
    canChangeStatus: (actualStatus: AvailabilityStatus) => {
        const listOfUnvalidTransition: Array<AvailabilityStatus> = unvalidTransition.get(actualStatus) || [];
        return {
            to: (futureStatus: AvailabilityStatus): boolean => {
                return !listOfUnvalidTransition.includes(futureStatus);
            },
        };
    },
};

const basicStatus: Array<AvailabilityStatus> = [
    AvailabilityStatus.SPEAKER,
    AvailabilityStatus.JITSI,
    AvailabilityStatus.UNCHANGED,
    AvailabilityStatus.SILENT,
    AvailabilityStatus.AWAY,
    AvailabilityStatus.UNRECOGNIZED,
    AvailabilityStatus.BBB,
    AvailabilityStatus.DENY_PROXIMITY_MEETING,
];
const setableStatus: Array<AvailabilityStatus> = [
    AvailabilityStatus.BUSY,
    AvailabilityStatus.DO_NOT_DISTRUB,
    AvailabilityStatus.BACK_IN_A_MOMENT,
];

const unvalidTransition: Map<AvailabilityStatus, Array<AvailabilityStatus>> = new Map([
    [AvailabilityStatus.UNCHANGED, [...setableStatus]],
    [AvailabilityStatus.ONLINE, []],
    [AvailabilityStatus.SILENT, [...setableStatus]],
    [AvailabilityStatus.AWAY, [...setableStatus]],
    [AvailabilityStatus.JITSI, [...setableStatus]],
    [AvailabilityStatus.BBB, [...setableStatus]],
    [AvailabilityStatus.DENY_PROXIMITY_MEETING, [...setableStatus]],
    [AvailabilityStatus.SPEAKER, [...setableStatus]],
    [AvailabilityStatus.BUSY, [...basicStatus]],
    [AvailabilityStatus.DO_NOT_DISTRUB, [...basicStatus]],
    [AvailabilityStatus.BACK_IN_A_MOMENT, [...basicStatus]],
    [AvailabilityStatus.UNRECOGNIZED, []],
]);
