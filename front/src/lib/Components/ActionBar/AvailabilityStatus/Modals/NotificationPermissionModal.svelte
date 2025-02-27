<script lang="ts">
    import { ConfirmationModalPropsInterface } from "../Interfaces/ConfirmationModalPropsInterface";
    import LL from "../../../../../i18n/i18n-svelte";
    import { helpNotificationSettingsVisibleStore } from "../../../../Stores/HelpSettingsStore";
    import { localUserStore } from "../../../../Connection/LocalUserStore";
    import { popupStore } from "../../../../Stores/PopupStore";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    let loading = false;

    const confirmationModalProps: ConfirmationModalPropsInterface = {
        handleAccept: () => {
            loading = true;
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(true);
                        helpNotificationSettingsVisibleStore.set(false);
                    } else {
                        console.error("Notification permission status: ", response);
                        helpNotificationSettingsVisibleStore.set(true);
                    }
                })
                .catch((e) => {
                    console.error(e);
                })
                .finally(() => {
                    popupStore.removePopup("notification_permission_modal");
                    loading = false;
                });
        },
        handleClose: () => {
            popupStore.removePopup("notification_permission_modal");
        },
        acceptLabel: $LL.statusModal.accept(),
        closeLabel: $LL.statusModal.close(),
    };
</script>

<ConfirmationModal props={confirmationModalProps}>
    <div id="notificationPermission" class="grow text-center text-xl">
        {$LL.statusModal.allowNotification()}
    </div>
    <div>
        {$LL.statusModal.allowNotificationExplanation()}
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
