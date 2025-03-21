<script lang="ts">
    import { IconRefresh, IconLoader } from "@wa-icons";
    import LL from "../../../i18n/i18n-svelte";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { get } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";

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
        ? 'tw-bottom-0'
        : 'tw-h-full'} tw-absolute tw-z-[999999999] tw-gap-2 tw-py-4 tw-left-0 tw-flex tw-flex-col tw-flex-1 tw-w-full tw-backdrop-blur-2xl tw-items-center tw-justify-center"
>
    <div class="tw-flex tw-flex-col tw-gap-2 tw-items-center tw-justify-center">
        {#if !dismissError}
            <IconRefresh font-size={50} />
        {/if}
        <h3>{$LL.chat.whoops()}</h3>
    </div>
    <button
        class="tw-bg-danger tw-w-44 tw-text-white tw-rounded-md tw-px-4 tw-py-2"
        on:click={refreshChat}
        disabled={isRefreshing}
    >
        {#if isRefreshing}
            <IconLoader class="tw-animate-spin" />
        {:else}
            <span class="tw-text-center tw-w-full">
                {$LL.chat.refreshChat()}
            </span>
        {/if}
    </button>
    {#if !dismissError}
        <button
            class="tw-rounded-md tw-px-4 tw-py-2"
            on:click={() => {
                dismissError = true;
            }}
        >
            {$LL.chat.dismiss()}
        </button>
    {/if}
</div>
