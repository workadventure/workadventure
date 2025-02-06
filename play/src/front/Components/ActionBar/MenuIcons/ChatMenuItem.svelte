<script lang="ts">
    import { writable } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import MessageCircleIcon from "../../Icons/MessageCircleIcon.svelte";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { peerStore } from "../../../Stores/PeerStore";

    const dispatch = createEventDispatcher();

    function toggleChat() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
        dispatch("click");
    }

    // TODO: this is always 0. Fix this.
    let totalMessagesToSee = writable<number>(0);
</script>

<ActionBarButtonWrapper classList="group/btn-message-circle">
    <ActionBarIconButton
        on:click={() => {
            toggleChat();
            navChat.switchToChat();
            analyticsClient.openedChat();
        }}
        tooltipTitle={$LL.actionbar.help.chat.title()}
        tooltipDesc={$LL.actionbar.help.chat.desc()}
        dataTestId="chat-btn"
        state={"normal"}
        disabledHelp={false}
    >
        <MessageCircleIcon />
    </ActionBarIconButton>
    {#if $chatZoneLiveStore || $peerStore.size > 0}
        <div>
            <span class="w-4 h-4 block rounded-full absolute -top-1 -left-1 animate-ping bg-white" />
            <span class="w-3 h-3 block rounded-full absolute -top-0.5 -left-0.5 bg-white" />
        </div>
    {:else if $totalMessagesToSee > 0}
        <div
            class="absolute -top-2 -left-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
        >
            {$totalMessagesToSee}
        </div>
    {/if}
</ActionBarButtonWrapper>
