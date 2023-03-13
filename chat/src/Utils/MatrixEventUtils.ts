import { MatrixEvent } from "matrix-js-sdk";
import { get } from "svelte/store";
import LL from "../i18n/i18n-svelte";

function getLocaleType(event: MatrixEvent): string {
    const type = event.getType();
    switch (type) {
        case "m.room.create": {
            return get(LL).events.createsRoom();
        }
        case "m.room.member": {
            return get(LL).events.memberJoins();
        }
        case "m.room.name": {
            return get(LL).events.changesRoomNameTo() + " " + event.getContent().name;
        }
        case "m.room.power_levels": {
            return get(LL).events.changesRoomPowerLevels();
        }
        case "m.room.join_rules": {
            return get(LL).events.changesRoomJoinRules();
        }
        case "m.room.history_visibility": {
            return get(LL).events.changesRoomHistoryVisibility();
        }
        case "m.room.guest_access": {
            return get(LL).events.changesRoomGuestAccess();
        }
        case "m.room.encryption": {
            return get(LL).events.activatesRoomEncryption();
        }
        default:
            return type;
    }
}

export { getLocaleType };
