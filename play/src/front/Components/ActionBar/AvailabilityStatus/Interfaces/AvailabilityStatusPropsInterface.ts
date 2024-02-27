import { AvailabilityStatus } from "@workadventure/messages";

export interface StatusInformationInterface {
    AvailabilityStatus: AvailabilityStatus;
    label: string;
    colorHex: string;
}

export interface AvailabilityStatusPropsInterface {
    menuVisibility: boolean;
    statusColorHex: string;
    currentPlayerName: string;
    listStatusTitle: string;
}

export interface AvailabilityStatusListPropsInterface {
    currentStatus: AvailabilityStatus;
    statusInformations: Array<StatusInformationInterface>;
    listStatusTitle: string;
}
