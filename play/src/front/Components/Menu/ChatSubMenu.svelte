<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { openModal } from "svelte-modals";
    import { profileAvailable, userIsConnected } from "../../Stores/MenuStore";
    import { iframeListener } from "../../Api/IframeListener";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import ResetKeyBackupConfirmationModal from "./ResetKeyBackupConfirmationModal.svelte";

    let profileIframe: HTMLIFrameElement;
    let chatSounds: boolean = localUserStore.getChatSounds();
    let mychatID = localUserStore.getChatId();

    function changeChatSounds() {
        localUserStore.setChatSounds(chatSounds);
    }

    function openResetCrossSigningKey() {
        openModal(ResetKeyBackupConfirmationModal);
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
        {#if $userIsConnected}
            <h3 class="blue-title tw-pt-2">{$LL.menu.chat.matrixIDLabel()}</h3>
            <div class="tw-flex tw-w-full tw-justify-center tw-py-1">
                {mychatID}
            </div>
            <h3 class="blue-title tw-py-2">{$LL.menu.chat.settings()}</h3>
            <label>
                <input type="checkbox" bind:checked={chatSounds} on:change={changeChatSounds} />
                <span>{$LL.menu.settings.chatSounds()}</span>
            </label>
            <section class="centered-column resizing-width tw-m-auto resizing-text">
                <button
                    type="button"
                    class="tw-w-full tw-bg-danger-900 tw-min-w-[220px] tw-flex tw-justify-center tw-items-center"
                    on:click={openResetCrossSigningKey}>{$LL.menu.chat.resetKeyBackUpButtonLabel()}</button
                >
            </section>
        {:else}
            <div class="tw-flex tw-flex-col tw-gap-2 tw-w-full tw-h-full tw-items-center">
                <p class="tw-text-gray-400 tw-w-full tw-text-center tw-pt-2">
                    {$LL.chat.requiresLoginForChat()}
                </p>
                <a
                    type="button"
                    class="btn light tw-flex tw-justify-center tw-items-center tw-w-1/2"
                    href="/login"
                    on:click={() => analyticsClient.login()}
                >
                    {$LL.menu.profile.login()}</a
                >
            </div>
        {/if}
    </div>
</div>
