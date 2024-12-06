import { AvailabilityStatus } from "@workadventure/messages";
import { LocalizedString } from "typesafe-i18n";
import { RequestedStatus } from "../../../../Rules/StatusRules/statusRules";
export interface StatusInformationInterface {
    AvailabilityStatus: RequestedStatus | AvailabilityStatus.ONLINE;
    label: LocalizedString | string;
    colorHex: string;
}

export interface AvailabilityStatusPropsInterface {
    menuVisibility: boolean;
    statusColorHex: string;
    currentPlayerName: string;
    listStatusTitle: string;
}
