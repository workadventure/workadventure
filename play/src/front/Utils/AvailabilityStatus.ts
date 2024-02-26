import { AvailabilityStatus } from "@workadventure/messages";
import { get } from "svelte/store";
import LL from "../../i18n/i18n-svelte";

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
    statusToShow: Array<AvailabilityStatus>
): Array<{ AvailabilityStatus: AvailabilityStatus; label: string; colorHex: string }> => {
    return statusToShow.map((status) => {
        return {
            AvailabilityStatus: status,
            label: get(LL).actionbar.status[AvailabilityStatus[status]](),
            colorHex: getColorHexOfStatus(status),
        };
    });
};
