<script lang="ts">
    import walk from "../../images/walk.svg";
    import teleport from "../../images/teleport.svg";
    import businessCard from "../../images/business-cards.svg";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { scriptUtils } from "../../../Api/ScriptUtils";
    import { requestVisitCardsStore } from "../../../Stores/GameStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { showReportScreenStore } from "../../../Stores/ShowReportScreenStore";
    import { openChatRoom } from "../../Utils";
    import { IconForbid, IconMessage, IconLoader } from "@wa-icons";

    export let user: ChatUser;

    const { connection, roomUrl } = gameManager.getCurrentGameScene();

    const chatConnection = gameManager.chatConnection;

    const isInTheSameMap = user.playUri === roomUrl;

    const roomCreationInProgress = chatConnection.roomCreationInProgress;

    const iAmAdmin = connection?.hasTag("admin");

    const goTo = (type: string, playUri: string, uuid: string) => {
        if (type === "room") {
            scriptUtils.goToPage(`${playUri}#moveToUser=${uuid}`);
        } else if (type === "user") {
            if (user.uuid && connection && user.playUri) connection.emitAskPosition(user.uuid, user.playUri);
        }
    };

    let chatMenuActive = false;

    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };

    const showBusinessCard = (visitCardUrl: string | undefined) => {
        if (visitCardUrl) {
            requestVisitCardsStore.set(visitCardUrl);
        }
        closeChatUserMenu();
    };
</script>

<div class="wa-dropdown">
    <button
        class="tw-m-0 tw-p-1 tw-rounded-lg hover:tw-bg-white/10 tw-bg-transparent"
        on:click|stopPropagation={openChatUserMenu}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-dots"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
            <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        </svg>
    </button>
    <!-- on:mouseleave={closeChatUserMenu} -->
    <div
        class="tw-bg-contrast/50 tw-backdrop-blur-md tw-rounded-lg tw-overflow-hidden tw-z-[1] tw-w-max tw-right-2 tw-top-10 tw-p-1 tw-absolute"
        class:tw-invisible={!chatMenuActive}
        on:mouseleave={closeChatUserMenu}
    >
        {#if user.roomName}
            {#if isInTheSameMap}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span
                    class="walk-to wa-dropdown-item tw-flex tw-gap-2 tw-items-center hover:tw-bg-white/10 tw-m-0 tw-p-2 tw-w-full tw-text-sm tw-rounded"
                    on:click|stopPropagation={() => goTo("user", user.playUri ?? "", user.uuid ?? "")}
                    ><img class="noselect" src={walk} alt="Walk to logo" height="13" width="13" />
                    {$LL.chat.userList.walkTo()}</span
                >
            {:else}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span
                    class="teleport wa-dropdown-item tw-flex tw-gap-2 tw-items-center hover:tw-bg-white/10 tw-m-0 tw-p-2 tw-w-full tw-text-sm tw-rounded"
                    on:click|stopPropagation={() => goTo("room", user.playUri ?? "", user.uuid ?? "")}
                    ><img class="noselect" src={teleport} alt="Teleport to logo" height="13" width="13" />
                    {$LL.chat.userList.teleport()}</span
                >
            {/if}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            {#if user.visitCardUrl}
                <span
                    class="businessCard wa-dropdown-item tw-flex tw-gap-2 tw-items-center hover:tw-bg-white/10 tw-m-0 tw-p-2 tw-w-full tw-text-sm tw-rounded"
                    on:click|stopPropagation={() => showBusinessCard(user.visitCardUrl)}
                    ><img class="noselect" src={businessCard} alt="Business card" height="13" width="13" />
                    {$LL.chat.userList.businessCard()}</span
                >
            {/if}
        {/if}

        {#if user.chatId && !$roomCreationInProgress}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span
                class="sendMessage wa-dropdown-item tw-flex tw-gap-2 tw-items-center hover:tw-bg-white/10 tw-m-0 tw-p-2 tw-w-full tw-text-sm tw-rounded"
                on:click|stopPropagation={() => openChatRoom(user.chatId)}
                ><IconMessage font-size="13" />
                {$LL.chat.userList.sendMessage()}</span
            >
        {:else if roomCreationInProgress}
            <div
                class="tw-min-h-[30px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1"
            >
                <IconLoader class="tw-animate-spin" />
            </div>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        {#if iAmAdmin}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span
                class="ban wa-dropdown-item tw-text-pop-red"
                on:click|stopPropagation={() => {
                    if (user.username && user.id) {
                        showReportScreenStore.set({ userId: user.id, userName: user.username });
                    }
                }}><IconForbid font-size="13" /> {$LL.chat.ban.title()}</span
            >
        {/if}
    </div>
</div>
