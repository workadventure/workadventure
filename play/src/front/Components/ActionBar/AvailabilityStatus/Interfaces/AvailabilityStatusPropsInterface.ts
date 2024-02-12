import { AvailabilityStatus } from "../../../../../../../libs/messages";

export interface StatusInformationInterface {
    AvailabilityStatus: AvailabilityStatus;
    label: string;
    colorHex: string;
}

export interface AvailabilityStatusPropsInterface {
    menuVisibilility: boolean;
    statusColorHex: string;
    currentPlayerName: string;
    listStatusTitle: string;
}

export interface AvailabilityStatusListPropsInterface {
    currentStatus: AvailabilityStatus;
    statusInformations: Array<StatusInformationInterface>;
    listStatusTitle: string;
}
