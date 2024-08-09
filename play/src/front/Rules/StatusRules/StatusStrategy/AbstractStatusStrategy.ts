import { AvailabilityStatus } from "@workadventure/messages";
import { StatusStrategyInterface } from "../StatusStrategyInterface";
import { TimedRules } from "../statusRules";

export abstract class StatusStrategy implements StatusStrategyInterface {
    private timeoutIds: Array<NodeJS.Timeout> = [];
    protected userNameInteraction = "";
    protected constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.ONLINE,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = []
    ) {}

    applyBasicRules() {
        this.basicRules.forEach((rule) => {
            rule();
        });
    }

    applyTimedRules() {
        this.timedRules.forEach(({ rule, applyIn }) => {
            const ruleTimeoutId = setTimeout(rule, applyIn);
            this.timeoutIds.push(ruleTimeoutId);
        });
    }

    applyInteractionRules() {
        this.interactionRules.forEach((rule) => {
            rule();
        });
    }

    cleanTimedRules() {
        this.timeoutIds.forEach((id) => {
            clearTimeout(id);
        });
    }

    applyAllRules() {
        this.applyTimedRules();
        this.applyBasicRules();
    }

    getActualStatus(): AvailabilityStatus {
        return this.status;
    }

    toMilliseconds(hrs: number, min: number, sec: number) {
        return (hrs * 60 * 60 + min * 60 + sec) * 1000;
    }

    setUserNameInteraction(name: string) {
        this.userNameInteraction = name;
    }

    allowNotificationSound(): boolean {
        return true;
    }
}
