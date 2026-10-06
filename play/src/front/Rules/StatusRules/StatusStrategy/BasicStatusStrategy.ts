import { AvailabilityStatus } from "@workadventure/messages";
import type { TimedRules } from "../statusRules";
import { StatusStrategy } from "./AbstractStatusStrategy";

export class BasicStatusStrategy extends StatusStrategy {
    constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.ONLINE,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = [],
    ) {
        super(status, basicRules, timedRules, interactionRules);
    }

    allowNotificationSound(): boolean {
        switch (this.status) {
            // Sound being blocked, the notification could not play anyway, and trying
            // would signal the block again.
            case AvailabilityStatus.SOUND_BLOCKED:
            case AvailabilityStatus.SILENT:
            case AvailabilityStatus.JITSI:
            case AvailabilityStatus.BBB:
            case AvailabilityStatus.SPEAKER:
                return false;
            default:
                return true;
        }
    }
}
