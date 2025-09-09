<script lang="ts">
    import { writable } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import MessageCircleIcon from "../../Icons/MessageCircleIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { videoStreamElementsStore } from "../../../Stores/PeerStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";

    export let last: boolean | undefined = undefined;
    export let chatEnabledInAdmin = false;

    const proximityChatRoom = gameManager.getCurrentGameScene().proximityChatRoom;

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function toggleChat() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
        dispatch("click");
    }

    const shortcut = ["c"];

    let chatAvailable = false;
    gameManager
        .getChatConnection()
        .then(() => {
            chatAvailable = true;
        })
        .catch((e: unknown) => {
            console.error("Could not get chat", e);
        });

    // TODO: this is always 0. Fix this.
    let totalMessagesToSee = writable<number>(0);
</script>

<ActionBarButton
    on:click={() => {
        toggleChat();
        navChat.switchToChat();
        if (!chatEnabledInAdmin) {
            selectedRoomStore.set(proximityChatRoom);
            proximityChatRoom.hasUnreadMessages.set(false);
        }
        analyticsClient.openedChat();
    }}
    classList="group/btn-message-circle rounded-r-lg pe-2 {last ? '' : '@sm/actions:rounded-r-none @sm/actions:pe-0'}"
    tooltipTitle={$LL.actionbar.help.chat.title()}
    desc={$LL.actionbar.help.chat.desc()}
    media="./static/Videos/Chat.mp4"
    tooltipShortcuts={shortcut}
    dataTestId="chat-btn"
    state={chatAvailable ? "normal" : "disabled"}
    {last}
    disabledHelp={false}
>
    <MessageCircleIcon />
</ActionBarButton>
{#if $chatZoneLiveStore || $videoStreamElementsStore.length > 0}
    <div>
        <span class="w-4 h-4 block rounded-full absolute -top-1 -start-1 animate-ping bg-white" />
        <span class="w-3 h-3 block rounded-full absolute -top-0.5 -start-0.5 bg-white" />
    </div>
{:else if $totalMessagesToSee > 0}
    <div
        class="absolute -top-2 -start-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
    >
        {$totalMessagesToSee}
    </div>
{/if}
