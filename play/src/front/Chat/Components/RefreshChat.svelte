<script lang="ts">
    import { get } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { IconRefresh, IconLoader } from "@wa-icons";

    const chat = gameManager.chatConnection;
    let dismissError = false;
    let isRefreshing = false;

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
    class="{dismissError
        ? 'bottom-0'
        : 'h-full'} absolute z-[999999999] gap-2 py-4 left-0 flex flex-col flex-1 w-full backdrop-blur-2xl items-center justify-center"
>
    <div class="flex flex-col gap-2 items-center justify-center">
        {#if !dismissError}
            <IconRefresh font-size={50} />
        {/if}
        <h3>{$LL.chat.whoops()}</h3>
    </div>
    <button class="bg-danger w-44 text-white rounded-md px-4 py-2" on:click={refreshChat} disabled={isRefreshing}>
        {#if isRefreshing}
            <IconLoader class="animate-spin" />
        {:else}
            <span class="text-center w-full">
                {$LL.chat.refreshChat()}
            </span>
        {/if}
    </button>
    {#if !dismissError}
        <button
            class="rounded-md px-4 py-2"
            on:click={() => {
                dismissError = true;
            }}
        >
            {$LL.chat.dismiss()}
        </button>
    {/if}
</div>
