<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { openModal } from "svelte-modals";
    import { profileAvailable } from "../../Stores/MenuStore";
    import { iframeListener } from "../../Api/IframeListener";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { LL } from "../../../i18n/i18n-svelte";
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
    </div>
</div>
