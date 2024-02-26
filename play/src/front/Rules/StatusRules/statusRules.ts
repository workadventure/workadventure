import { AvailabilityStatus } from "../../../../../libs/messages";

export interface StatusRulesVerificationInterface {
    canChangeStatus: (actualStatus: AvailabilityStatus) => { to: (futureStatus: AvailabilityStatus) => boolean };
}

export type TimedRules = {
    applyIn: number;
    rule: () => void;
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
export const setableStatus: Array<AvailabilityStatus> = [
    AvailabilityStatus.BUSY,
    AvailabilityStatus.DO_NOT_DISTURB,
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
    [AvailabilityStatus.DO_NOT_DISTURB, [...basicStatus]],
    [AvailabilityStatus.BACK_IN_A_MOMENT, [...basicStatus]],
    [AvailabilityStatus.UNRECOGNIZED, []],
]);

export const StatusRules = {
    canChangeStatus: (actualStatus: AvailabilityStatus) => {
        const listOfUnvalidTransition: Array<AvailabilityStatus> = unvalidTransition.get(actualStatus) || [];
        return {
            to: (futureStatus: AvailabilityStatus): boolean => {
                return !listOfUnvalidTransition.includes(futureStatus);
            },
        };
    },
};
