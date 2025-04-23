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
    import { peerStore } from "../../../Stores/PeerStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { userIsAdminStore } from "../../../Stores/GameStore";
    // import {ADMIN_BO_URL} from "../../../Enum/EnvironmentVariable";
    // import AdjustmentsIcon from "../../Icons/AdjustmentsIcon.svelte";

    export let last: boolean | undefined = undefined;
    export let chatEnabledInAdmin = true;

    const dispatch = createEventDispatcher();

    function toggleChat() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
        dispatch("click");
    }

    let chatAvailable = false;
    gameManager
        .getChatConnection()
        .then(() => {
            chatAvailable = chatEnabledInAdmin ?? true;
        })
        .catch((e: unknown) => {
            console.error("Could not get chat", e);
        });

    // TODO: this is always 0. Fix this.
    let totalMessagesToSee = writable<number>(0);

    function getTooltipTitle() {
        if (chatEnabledInAdmin) {
            return $LL.actionbar.help.chat.title();
        } else {
            if (userIsAdminStore) {
                return $LL.actionbar.help.chat.disabledAdmin.title();
            } else {
                return $LL.actionbar.help.chat.disabled.title();
            }
        }
    }

    function getTooltipDesc() {
        if (chatEnabledInAdmin) {
            return $LL.actionbar.help.chat.desc();
        } else {
            if (userIsAdminStore) {
                return $LL.actionbar.help.chat.disabledAdmin.desc();
            } else {
                return $LL.actionbar.help.chat.disabled.desc();
            }
        }
    }

    // function openBo() {
    //     if (!ADMIN_BO_URL) {
    //         throw new Error("ADMIN_BO_URL not set");
    //     }
    //     const url = new URL(ADMIN_BO_URL, window.location.href);
    //     url.searchParams.set("playUri", window.location.href);
    //     window.open(url, "_blank");
    // }
</script>

<ActionBarButton
    on:click={() => {
        toggleChat();
        navChat.switchToChat();
        analyticsClient.openedChat();
    }}
    classList="group/btn-message-circle rounded-r-lg pr-2 @sm/actions:rounded-r-none @sm/actions:pr-0"
    tooltipTitle={getTooltipTitle()}
    tooltipDesc={getTooltipDesc()}
    dataTestId="chat-btn"
    state={chatAvailable ? "normal" : "disabled"}
    {last}
    disabledHelp={false}
>
    <MessageCircleIcon />

    <!--    <div slot="tooltipEnd">-->
    <!--        <button class="btn btn-secondary btn-sm w-full" on:click|stopPropagation={openBo}>-->
    <!--            <AdjustmentsIcon />-->
    <!--            {$LL.actionbar.help.chat.disabledAdmin.goToAdmin()}-->
    <!--        </button>-->
    <!--    </div>-->
</ActionBarButton>
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
