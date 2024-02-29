import { AvailabilityStatus } from "@workadventure/messages";
import { LocalizedString } from "typesafe-i18n";
export interface StatusInformationInterface {
    AvailabilityStatus: AvailabilityStatus;
    label: LocalizedString | string;
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
