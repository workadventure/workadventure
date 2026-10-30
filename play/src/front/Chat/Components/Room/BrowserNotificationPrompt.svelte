<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { browserNotificationStore, notificationPromptStore } from "../../../Stores/BrowserNotificationStore";
    import Button from "../../../Components/UI/Button.svelte";

    function enable(): void {
        notificationPromptStore.set(false);
        Notification.requestPermission()
            .then((permission) => {
                localUserStore.setNotification(permission === "granted");
                if (permission !== "granted") {
                    localUserStore.setNotificationPromptDismissed();
                }
                browserNotificationStore.refresh();
            })
            .catch((e) => console.error(e));
    }

    function later(): void {
        notificationPromptStore.set(false);
        localUserStore.setNotificationPromptDismissed();
    }
</script>

{#if $notificationPromptStore}
    <div
        class="mx-2 flex flex-wrap items-center gap-2 rounded-lg border border-solid border-secondary bg-secondary/20 py-1 ps-3 pe-1 text-sm text-white"
        role="status"
        data-testid="browserNotificationPrompt"
    >
        <span class="min-w-0 grow">{$LL.chat.notificationPrompt.question()}</span>
        <Button variant="secondary" size="xs" onclick={enable} dataTestId="browserNotificationPromptEnable">
            {$LL.chat.notificationPrompt.enable()}
        </Button>
        <Button
            variant="light"
            appearance="ghost"
            size="xs"
            onclick={later}
            dataTestId="browserNotificationPromptLater"
        >
            {$LL.chat.notificationPrompt.later()}
        </Button>
    </div>
{/if}
