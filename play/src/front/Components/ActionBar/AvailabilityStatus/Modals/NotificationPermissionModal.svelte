<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import { notificationPermissionModalVisibility } from "../../../../Stores/AvailabilityStatusModalsStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../../Administration/AnalyticsClient";
    import { localUserStore } from "../../../../Connection/LocalUserStore";
    import { iframeListener } from "../../../../Api/IframeListener";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            notificationPermissionModalVisibility.close();
            analyticsClient.settingNotification("true");
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(true);
                        iframeListener.sendSettingsToChatIframe();
                    }
                })
                .catch((e) => console.error(e));
        },
        handleClose: () => {
            notificationPermissionModalVisibility.close();
        },
        acceptLabel: $LL.statusModal.accept(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div class="tw-grow tw-text-center tw-text-xl ">
        {$LL.statusModal.allowNotification()}
    </div>
</ConfirmationModal>
