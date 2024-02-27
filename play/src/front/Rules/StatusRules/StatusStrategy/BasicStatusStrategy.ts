import { AvailabilityStatus } from "@workadventure/messages";
import { TimedRules } from "../statusRules";
import { StatusStrategy } from "./AbstractStatusStrategy";

export class BasicStatusStrategy extends StatusStrategy {
    constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.ONLINE,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = []
    ) {
        super(status, basicRules, timedRules, interactionRules);
    }
}
