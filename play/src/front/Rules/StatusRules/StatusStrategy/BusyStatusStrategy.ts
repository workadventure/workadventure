import { AvailabilityStatus } from "@workadventure/messages";
import { TimedRules } from "../statusRules";
import { askIfUserWantToJoinBubbleOf, askToChangeStatus } from "../statusChangerFunctions";
//import { helpNotificationSettingsVisibleStore } from "../../../Stores/HelpSettingsStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { popupStore } from "../../../Stores/PopupStore";
import NotificationPermissionModal from "../../../Components/ActionBar/AvailabilityStatus/Modals/NotificationPermissionModal.svelte";
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
        if (!("Notification" in window)) return false;
        return Notification.permission === permission;
    };

    private lastNotificationPermissionRequestMoreThanTwoWeeks = (d1: Date): boolean => {
        const diffTime = Math.abs(new Date().getTime() - d1.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const diffWeeks = Math.floor(diffDays / 7);
        return diffWeeks >= 2;
    };

    private showNotificationPermissionModal = () => {
        const localStoragelastNotificationPermissionRequest: string | null =
            localUserStore.getLastNotificationPermissionRequest();
        const lastNotificationPermissionRequest = localStoragelastNotificationPermissionRequest
            ? new Date(localStoragelastNotificationPermissionRequest)
            : new Date();

        if (this.NotificationPermissionIs("default")) {
            this.openNotificationPermissionModal();
        }

        if (
            (this.NotificationPermissionIs("denied") &&
                this.lastNotificationPermissionRequestMoreThanTwoWeeks(lastNotificationPermissionRequest)) ||
            localStoragelastNotificationPermissionRequest === null
        ) {
            this.openNotificationPermissionModal();
            localUserStore.setLastNotificationPermissionRequest();
        }
    };

    private openNotificationPermissionModal = () => {
        popupStore.addPopup(NotificationPermissionModal, {}, "notification_permission_modal");
    };
}
