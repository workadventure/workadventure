<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import {
        notificationPermissionModalVisibility,
        recommendedActiveNotification,
    } from "../../../../Stores/AvailabilityStatusModalsStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import { helpNotificationSettingsVisibleStore } from "../../../../Stores/HelpSettingsStore";
    import { localUserStore } from "../../../../Connection/LocalUserStore";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    let loading = false;

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            loading = true;
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(true);
                        recommendedActiveNotification.close();
                    } else {
                        helpNotificationSettingsVisibleStore.set(true);
                    }
                })
                .finally(() => {
                    notificationPermissionModalVisibility.close();
                    loading = false;
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
    <div id="notificationPermission" class="tw-grow tw-text-center tw-text-xl">
        {$LL.statusModal.allowNotification()}
    </div>
    {#if loading}
        <div class="tw-absolute tw-inset-0 tw-bg-dark-purple/70 tw-flex tw-items-center tw-justify-center">
            <div
                style="border-top-color:transparent"
                class="tw-w-16 tw-h-16 tw-border-2 tw-border-white tw-border-solid tw-rounded-full tw-animate-spin tw-mb-5"
            />
        </div>
    {/if}
</ConfirmationModal>
