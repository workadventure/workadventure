import { get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { LocalizedString } from "typesafe-i18n";
import LL from "../../i18n/i18n-svelte";
import { StatusInformationInterface } from "../Components/ActionBar/AvailabilityStatus/Interfaces/AvailabilityStatusPropsInterface";
import { RequestedStatus } from "../Rules/StatusRules/statusRules";

const COLORS: Record<AvailabilityStatus, { filling: number; outline: number }> = {
    [AvailabilityStatus.AWAY]: { filling: 0xe9c84e, outline: 0xd3873b },
    [AvailabilityStatus.ONLINE]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.SPEAKER]: { filling: 0xe9c84e, outline: 0xd3873b },
    [AvailabilityStatus.SILENT]: { filling: 0xe74c3c, outline: 0xc0392b },
    [AvailabilityStatus.JITSI]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.BBB]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.DENY_PROXIMITY_MEETING]: { filling: 0xffffff, outline: 0x4156f6 },
    [AvailabilityStatus.UNRECOGNIZED]: { filling: 0xffffff, outline: 0xffffff },
    [AvailabilityStatus.UNCHANGED]: { filling: 0xffffff, outline: 0xffffff },
    [AvailabilityStatus.BACK_IN_A_MOMENT]: { filling: 0x7382e2, outline: 0x4156f6 },
    [AvailabilityStatus.DO_NOT_DISTURB]: { filling: 0xe96e53, outline: 0xcc5151 },
    [AvailabilityStatus.BUSY]: { filling: 0xe9c84e, outline: 0xd3873b },
};

export const getColorOfStatus = (status: AvailabilityStatus): { filling: number; outline: number } => {
    return COLORS[status];
};

export const getColorHexOfStatus = (status: AvailabilityStatus): string => {
    return `#${COLORS[status].filling.toString(16)}`;
};

export const getStatusLabel = (status: AvailabilityStatus): string => {
    //@ts-ignore Enum[key] is a string in Typescript
    const fn = get(LL).actionbar.status[AvailabilityStatus[status]];
    return fn?.() || "Unknown";
};

export const getStatusInformation = (
    statusToShow: Array<RequestedStatus | AvailabilityStatus.ONLINE>
): Array<StatusInformationInterface> => {
    const labelStatusMap: Map<RequestedStatus | AvailabilityStatus.ONLINE, LocalizedString> = new Map([
        [AvailabilityStatus.BACK_IN_A_MOMENT, get(LL).actionbar.status.BACK_IN_A_MOMENT()],
        [AvailabilityStatus.BUSY, get(LL).actionbar.status.BUSY()],
        [AvailabilityStatus.DO_NOT_DISTURB, get(LL).actionbar.status.DO_NOT_DISTURB()],
        [AvailabilityStatus.ONLINE, get(LL).actionbar.status.ONLINE()],
    ]);

    return statusToShow.map((status: RequestedStatus | AvailabilityStatus.ONLINE) => {
        return {
            AvailabilityStatus: status,
            label: labelStatusMap.get(status) || "",
            colorHex: getColorHexOfStatus(status),
        };
    });
};
