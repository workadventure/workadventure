import { get, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { setableStatus } from "../Rules/StatusRules/statusRules";
import { availabilityStatusStore } from "./MediaStore";

function createAvailabilityStatusMenuStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        openAvailabilityStatusMenu() {
            if ([...setableStatus, AvailabilityStatus.ONLINE].includes(get(availabilityStatusStore))) set(true);
        },
        closeAvailabilityStatusMenu() {
            set(false);
        },
    };
}

export const availabilityStatusMenuStore = createAvailabilityStatusMenuStore();
