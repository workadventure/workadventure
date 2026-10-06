import { AvailabilityStatus } from "@workadventure/messages";
import type { TimedRules } from "../statusRules";
import { askIfUserWantToJoinBubbleOf, askToChangeStatus } from "../statusChangerFunctions";
//import { helpNotificationSettingsVisibleStore } from "../../../Stores/HelpSettingsStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { popupStore } from "../../../Stores/PopupStore";
import NotificationPermissionModal from "../../../Components/ActionBar/AvailabilityStatus/Modals/NotificationPermissionModal.svelte";
import { DISABLE_NOTIFICATIONS } from "../../../Enum/EnvironmentVariable";
import { BasicStatusStrategy } from "./BasicStatusStrategy";

export class BusyStatusStrategy extends BasicStatusStrategy {
    constructor(
        protected status: AvailabilityStatus = AvailabilityStatus.BUSY,
        protected basicRules: Array<() => void> = [],
        protected timedRules: Array<TimedRules> = [],
        protected interactionRules: Array<() => void> = [],
    ) {
        super(status, basicRules, timedRules, interactionRules);
        timedRules.push({
            rule: askToChangeStatus,
            applyIn: this.toMilliseconds(1, 0, 0),
        });

        interactionRules.push(() => {
            askIfUserWantToJoinBubbleOf(this.userNameInteraction);
        });

        // Do not ask for a permission that will never be used.
        if (!DISABLE_NOTIFICATIONS) {
            this.basicRules.push(this.showNotificationPermissionModal);
        }
    }

    allowNotificationSound(): boolean {
        return true;
    }

    private lastNotificationPermissionRequestMoreThanTwoWeeks = (d1: Date): boolean => {
        const diffTime = Math.abs(new Date().getTime() - d1.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const diffWeeks = Math.floor(diffDays / 7);
        return diffWeeks >= 2;
    };

    // Ask while the browser has not decided yet. Once it denied, ask again only every two weeks:
    // the browser will not prompt anymore, so the modal can only point to the browser settings.
    private showNotificationPermissionModal = () => {
        if (!("Notification" in window) || Notification.permission === "granted") return;

        const lastRequest = localUserStore.getLastNotificationPermissionRequest();
        if (
            Notification.permission === "denied" &&
            lastRequest !== null &&
            !this.lastNotificationPermissionRequestMoreThanTwoWeeks(new Date(lastRequest))
        ) {
            return;
        }

        this.openNotificationPermissionModal();
        localUserStore.setLastNotificationPermissionRequest();
    };

    private openNotificationPermissionModal = () => {
        popupStore.addPopup(NotificationPermissionModal, {}, "notification_permission_modal");
    };
}
