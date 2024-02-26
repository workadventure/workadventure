import { AvailabilityStatus } from "../../../../../../libs/messages";
import { TimedRules } from "../statusRules";
import { askIfUserWantToJoinBubbleOf, askToChangeStatus } from "../statusChangerFunctions";
import { notificationPermissionModalVisibility } from "../../../Stores/AvailabilityStatusModalsStore";
import { BasicStatusStrategy } from "./BasicStatusStrategy";

export class BusyStatusStrategy extends BasicStatusStrategy {
    constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.BUSY,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = []
    ) {
        super(status, basicRules, timedRules, interactionRules);
        timedRules.push({
            rule: askToChangeStatus,
            applyIn: this.toMilliseconds(1, 0, 0),
        });

        interactionRules.push(() => {
            askIfUserWantToJoinBubbleOf(this.userNameInteraction);
        });

        this.basicRules.push(this.showNotificationPermissionModal);
    }

    allowNotificationSound(): boolean {
        return true;
    }

    private canIaskNotificationPermission = () => {
        console.log(Notification.permission);
        if (!("Notification" in window)) return false;
        return Notification.permission === "default";
    };
    private showNotificationPermissionModal = () => {
        if (this.canIaskNotificationPermission()) notificationPermissionModalVisibility.open();
    };
}
