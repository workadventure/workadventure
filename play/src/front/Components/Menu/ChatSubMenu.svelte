<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { openModal } from "svelte-modals";
    import { profileAvailable, userIsConnected } from "../../Stores/MenuStore";
    import { iframeListener } from "../../Api/IframeListener";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import resetKeyStorageConfirmationModal from "./ResetKeyStorageConfirmationModal.svelte";

    let profileIframe: HTMLIFrameElement;
    let chatSounds: boolean = localUserStore.getChatSounds();
    let mychatID = localUserStore.getChatId();

    function changeChatSounds() {
        localUserStore.setChatSounds(chatSounds);
    }

    function openResetKeyStorage() {
        openModal(resetKeyStorageConfirmationModal);
    }

    onMount(() => {
        if ($profileAvailable && profileIframe) iframeListener.registerIframe(profileIframe);
    });

    onDestroy(() => {
        if ($profileAvailable && profileIframe) iframeListener.unregisterIframe(profileIframe);
    });
</script>

<div class="customize-main">
    <div class="submenu">
        {#if gameManager.getCurrentGameScene().room.isChatEnabled}
            {#if $userIsConnected}
                <h3 class="blue-title pt-2">{$LL.menu.chat.matrixIDLabel()}</h3>
                <div class="flex w-full justify-center py-1">
                    {mychatID}
                </div>
                <h3 class="blue-title py-2">{$LL.menu.chat.settings()}</h3>
                <label>
                    <input type="checkbox" bind:checked={chatSounds} on:change={changeChatSounds} />
                    <span>{$LL.menu.settings.chatSounds()}</span>
                </label>
                <section class="centered-column resizing-width m-auto resizing-text">
                    <button
                        type="button"
                        class="w-full bg-danger-900 min-w-[220px] flex justify-center items-center"
                        on:click={openResetKeyStorage}>{$LL.menu.chat.resetKeyStorageUpButtonLabel()}</button
                    >
                </section>
            {:else}
                <div class="flex flex-col gap-2 w-full h-full items-center">
                    <p class="text-gray-400 w-full text-center pt-2">
                        {$LL.chat.requiresLoginForChat()}
                    </p>
                    <a
                        type="button"
                        class="btn light flex justify-center items-center w-1/2"
                        href="/login"
                        on:click={() => analyticsClient.login()}
                    >
                        {$LL.menu.profile.login()}</a
                    >
                </div>
            {/if}
        {/if}
    </div>
</div>
