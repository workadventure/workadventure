import { AvailabilityStatus } from "@workadventure/messages";
import { TimedRules } from "../statusRules";
import { askToChangeStatus } from "../statusChangerFunctions";
import { BasicStatusStrategy } from "./BasicStatusStrategy";

export class DoNotDisturbStatusStrategy extends BasicStatusStrategy {
    constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.DO_NOT_DISTURB,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = []
    ) {
        super(status, basicRules, timedRules, interactionRules);
        timedRules.push({
            rule: askToChangeStatus,
            applyIn: this.toMilliseconds(4, 0, 0),
        });
    }

    allowNotificationSound(): boolean {
        return false;
    }
}
