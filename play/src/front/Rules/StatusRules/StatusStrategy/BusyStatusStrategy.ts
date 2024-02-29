import { AvailabilityStatus } from "@workadventure/messages";
import { TimedRules } from "../statusRules";
import { askIfUserWantToJoinBubbleOf, askToChangeStatus } from "../statusChangerFunctions";
import { notificationPermissionModalVisibility } from "../../../Stores/AvailabilityStatusModalsStore";
import { helpNotificationSettingsVisibleStore } from "../../../Stores/HelpSettingsStore";
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

    private NotificationPermissionIs = (permission: "denied" | "default" | "granted") => {
        console.log("Notification Permission : ", Notification.permission);
        if (!("Notification" in window)) return false;
        return Notification.permission === permission;
    };

    private showNotificationPermissionModal = () => {
        if (this.NotificationPermissionIs("default")) notificationPermissionModalVisibility.open();
        if (this.NotificationPermissionIs("denied")) helpNotificationSettingsVisibleStore.set(true);
    };
}
