<script lang="ts">
    import { userIsConnected } from "../../Stores/MenuStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputCheckbox from "../Input/InputCheckbox.svelte";
    import resetKeyStorageConfirmationModal from "./ResetKeyStorageConfirmationModal.svelte";
    import { modals } from "@wa-modals";

    let chatSounds: boolean = $state(localUserStore.getChatSounds());
    let chatUrlPreviews: boolean = $state(localUserStore.getChatUrlPreviews());
    let chatUrlPreviewsInPrivate: boolean = $state(localUserStore.getChatUrlPreviewsInPrivate());
    let mychatID = localUserStore.getChatId();

    function changeChatSounds() {
        localUserStore.setChatSounds(chatSounds);
    }

    function changeChatUrlPreviews() {
        localUserStore.setChatUrlPreviews(chatUrlPreviews);
    }

    function changeChatUrlPreviewsInPrivate() {
        localUserStore.setChatUrlPreviewsInPrivate(chatUrlPreviewsInPrivate);
    }

    function openResetKeyStorage() {
        modals.open(resetKeyStorageConfirmationModal);
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
                        onchange={changeChatSounds}
                        label={$LL.menu.settings.chatSounds()}
                    />
                    <InputCheckbox
                        data-testid="chatUrlPreviews"
                        bind:value={chatUrlPreviews}
                        onchange={changeChatUrlPreviews}
                        label={$LL.menu.settings.chatUrlPreviews()}
                    />
                    <!-- Fetching a preview tells the homeserver about the URL, which is exactly
                         what encryption and proximity chat keep from it. Off unless asked for. -->
                    <InputCheckbox
                        data-testid="chatUrlPreviewsInPrivate"
                        bind:value={chatUrlPreviewsInPrivate}
                        onchange={changeChatUrlPreviewsInPrivate}
                        label={$LL.menu.settings.chatUrlPreviewsInPrivate()}
                    />
                </div>
                <section class="centered-column resizing-width m-auto resizing-text">
                    <button
                        type="button"
                        class="btn p-2 bg-danger-900 min-w-[220px] flex justify-center items-center"
                        onclick={openResetKeyStorage}>{$LL.menu.chat.resetKeyStorageUpButtonLabel()}</button
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
                        onclick={() => analyticsClient.login()}
                    >
                        {$LL.menu.profile.login()}</a
                    >
                </div>
            {/if}
        {/if}
    </div>
</div>
