import { AvailabilityStatus } from "@workadventure/messages";
import { TimedRules } from "../statusRules";
import { askToChangeStatus } from "../statusChangerFunctions";
import { BasicStatusStrategy } from "./BasicStatusStrategy";

export class BackInAMomentStatusStrategy extends BasicStatusStrategy {
    constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.BACK_IN_A_MOMENT,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = []
    ) {
        super(status, basicRules, timedRules, interactionRules);
        timedRules.push({
            rule: askToChangeStatus,
            applyIn: this.toMilliseconds(1, 0, 0),
        });
    }

    allowNotificationSound(): boolean {
        return false;
    }
}
