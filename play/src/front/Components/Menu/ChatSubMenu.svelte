<script lang="ts">
    import { openModal } from "svelte-modals";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputCheckbox from "../Input/InputCheckbox.svelte";
    import resetKeyStorageConfirmationModal from "./ResetKeyStorageConfirmationModal.svelte";

    let chatSounds: boolean = localUserStore.getChatSounds();
    let mychatID = localUserStore.getChatId();

    function changeChatSounds() {
        localUserStore.setChatSounds(chatSounds);
    }

    function openResetKeyStorage() {
        openModal(resetKeyStorageConfirmationModal);
    }
</script>

<div class="customize-main">
    <div class="submenu p-4">
        {#if gameManager.getCurrentGameScene().room.isChatEnabled}
            {#if $userIsConnected}
                <div class="flex w-full justify-start flex-row gap-4 items-center pb-4">
                    <span class="text-xl">{$LL.menu.chat.matrixIDLabel()} :</span>
                    <div class="flex justify-center p-2 bg-white text-secondary rounded">
                        {mychatID}
                    </div>
                </div>
                <div class="flex flex-col w-full h-full items-start justify-start pb-4">
                    <span class="font-xl blue-title text-lg">{$LL.menu.chat.settings()}</span>
                    <InputCheckbox
                        data-testid="chatSounds"
                        bind:value={chatSounds}
                        on:change={changeChatSounds}
                        label={$LL.menu.settings.chatSounds()}
                    />
                </div>
                <section class="centered-column resizing-width m-auto resizing-text">
                    <button
                        type="button"
                        class="btn p-2 bg-danger-900 min-w-[220px] flex justify-center items-center"
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
