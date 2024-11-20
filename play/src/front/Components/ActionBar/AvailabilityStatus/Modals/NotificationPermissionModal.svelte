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
    <div id="notificationPermission" class="grow text-center text-xl">
        {$LL.statusModal.allowNotification()}
    </div>
    {#if loading}
        <div class="absolute inset-0 bg-dark-purple/70 flex items-center justify-center">
            <div
                style="border-top-color:transparent"
                class="w-16 h-16 border-2 border-white border-solid rounded-full animate-spin mb-5"
            />
        </div>
    {/if}
</ConfirmationModal>
