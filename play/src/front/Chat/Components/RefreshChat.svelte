<script lang="ts">
    import { get } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { IconAlertTriangle, IconLoader } from "@wa-icons";

    // A slim bar where the user is (room list or conversation) instead of a full-screen veil over the room list,
    // which hid everything and was not even visible once a conversation was open in one column.
    const chat = gameManager.chatConnection;
    let isRefreshing = $state(false);

    function refreshChat() {
        isRefreshing = true;
        chat.retrySendingEvents()
            .catch(() => {
                warningMessageStore.addWarningMessage(get(LL).chat.refreshChatError());
            })
            .finally(() => {
                isRefreshing = false;
            });
    }
</script>

<div
    class="flex items-center gap-2 border border-solid border-x-0 border-t-0 border-danger-900/50 bg-danger-900/25 px-3 py-2 text-sm text-white"
    role="alert"
    data-testid="unsentMessagesBar"
>
    <IconAlertTriangle font-size="16" class="shrink-0 text-danger-400" />
    <span class="min-w-0 flex-1">{$LL.chat.unsentMessages()}</span>
    <button
        type="button"
        class="m-0 flex shrink-0 items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20 disabled:opacity-50"
        onclick={refreshChat}
        disabled={isRefreshing}
        data-testid="retryUnsentMessages"
    >
        {#if isRefreshing}
            <IconLoader class="animate-spin" font-size="14" />
        {/if}
        {$LL.chat.retrySending()}
    </button>
</div>
