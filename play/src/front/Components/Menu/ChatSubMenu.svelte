<script lang="ts">
    import { userIsConnected, menuVisiblilityStore } from "../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { navChat } from "../../Chat/Stores/ChatStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Button from "../UI/Button.svelte";

    function openChatSettings() {
        menuVisiblilityStore.set(false);
        navChat.switchToSettings();
        chatVisibilityStore.set(true);
    }
</script>

<div class="customize-main">
    <div class="submenu p-4">
        {#if gameManager.getCurrentGameScene().room.isChatEnabled}
            {#if $userIsConnected}
                <div class="flex flex-col items-start gap-3">
                    <p class="m-0 text-white/80">{$LL.menu.chat.movedToChat()}</p>
                    <Button variant="secondary" dataTestId="openChatSettingsButton" onclick={openChatSettings}>
                        {$LL.menu.chat.openChatSettings()}
                    </Button>
                </div>
            {:else}
                <div class="flex flex-col gap-2 w-full h-full items-center">
                    <p class="text-gray-400 w-full text-center pt-2">
                        {$LL.chat.requiresLoginForChat()}
                    </p>
                    <Button
                        class="light flex items-center w-1/2"
                        href="/login"
                        onclick={() => analyticsClient.trackAdminEvent("auth.login_clicked")}
                    >
                        {$LL.menu.profile.login()}</Button
                    >
                </div>
            {/if}
        {/if}
    </div>
</div>
