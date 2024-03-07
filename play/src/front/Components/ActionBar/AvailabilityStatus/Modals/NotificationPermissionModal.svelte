<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import {
        notificationPermissionModalVisibility,
        recommendedActiveNotification,
    } from "../../../../Stores/AvailabilityStatusModalsStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import { iframeListener } from "../../../../Api/IframeListener";
    import { helpNotificationSettingsVisibleStore } from "../../../../Stores/HelpSettingsStore";
    import { localUserStore } from "../../../../Connection/LocalUserStore";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(true);
                        iframeListener.sendSettingsToChatIframe();
                        recommendedActiveNotification.close();
                    } else {
                        helpNotificationSettingsVisibleStore.set(true);
                    }
                })
                .finally(() => {
                    notificationPermissionModalVisibility.close();
                });
        },
        handleClose: () => {
            notificationPermissionModalVisibility.close();
        },
        acceptLabel: $LL.statusModal.accept(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div id="notificationPermission" class="tw-grow tw-text-center tw-text-xl ">
        {$LL.statusModal.allowNotification()}
    </div>
</ConfirmationModal>
