import type { AvailabilityStatus } from "@workadventure/messages";
import type { LocalizedString } from "typesafe-i18n";
import type { RequestedStatus } from "../../../../Rules/StatusRules/statusRules";
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
