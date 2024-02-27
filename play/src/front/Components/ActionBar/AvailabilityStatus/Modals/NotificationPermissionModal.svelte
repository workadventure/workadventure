<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import { notificationPermissionModalVisibility } from "../../../../Stores/AvailabilityStatusModalsStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import { iframeListener } from "../../../../Api/IframeListener";
    import { MediaManager } from "../../../../WebRtc/MediaManager";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            const mediaManager = new MediaManager();
            mediaManager
                .askNotificationPermission()
                .then((acceptNotification: boolean) => {
                    if (acceptNotification) iframeListener.sendSettingsToChatIframe();
                })
                .catch((e) => {
                    console.error(e);
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
    <div class="tw-grow tw-text-center tw-text-xl ">
        {$LL.statusModal.allowNotification()}
    </div>
</ConfirmationModal>
