import { get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { LocalizedString } from "typesafe-i18n";
import LL from "../../i18n/i18n-svelte";
import { StatusInformationInterface } from "../Components/ActionBar/AvailabilityStatus/Interfaces/AvailabilityStatusPropsInterface";
import { RequestedStatus } from "../Rules/StatusRules/statusRules";

const COLORS: Record<AvailabilityStatus, { filling: number; outline: number }> = {
    [AvailabilityStatus.AWAY]: { filling: 0xf5931e, outline: 0x875d13 },
    [AvailabilityStatus.ONLINE]: { filling: 0x8cc43f, outline: 0x427a25 },
    [AvailabilityStatus.SPEAKER]: { filling: 0x8cc43f, outline: 0x427a25 },
    [AvailabilityStatus.SILENT]: { filling: 0xe74c3c, outline: 0xc0392b },
    [AvailabilityStatus.JITSI]: { filling: 0x8cc43f, outline: 0x427a25 },
    [AvailabilityStatus.BBB]: { filling: 0x8cc43f, outline: 0x427a25 },
    [AvailabilityStatus.DENY_PROXIMITY_MEETING]: { filling: 0xffffff, outline: 0x404040 },
    [AvailabilityStatus.UNRECOGNIZED]: { filling: 0xffffff, outline: 0xffffff },
    [AvailabilityStatus.UNCHANGED]: { filling: 0xffffff, outline: 0xffffff },
    [AvailabilityStatus.BACK_IN_A_MOMENT]: { filling: 0x6fa8dc, outline: 0x404040 },
    [AvailabilityStatus.DO_NOT_DISTURB]: { filling: 0xd00303, outline: 0xffffff },
    [AvailabilityStatus.BUSY]: { filling: 0xf5931e, outline: 0xffffff },
};

export const getColorOfStatus = (status: AvailabilityStatus): { filling: number; outline: number } => {
    return COLORS[status];
};

export const getColorHexOfStatus = (status: AvailabilityStatus): string => {
    return `#${COLORS[status].filling.toString(16)}`;
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
