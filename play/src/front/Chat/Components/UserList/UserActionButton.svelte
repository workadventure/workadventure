<script lang="ts">
    import walk from "../../images/walk.svg";
    import teleport from "../../images/teleport.svg";
    import businessCard from "../../images/business-cards.svg";
    import { ChatRoom, ChatUser } from "../../Connection/ChatConnection";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { scriptUtils } from "../../../Api/ScriptUtils";
    import { requestVisitCardsStore } from "../../../Stores/GameStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconForbid, IconDots, IconMessage, IconLoader } from "@wa-icons";
    import { navChat, selectedRoom } from "../../Stores/ChatStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { showReportScreenStore } from "../../../Stores/ShowReportScreenStore";

    export let user: ChatUser;

    const { connection, roomUrl } = gameManager.getCurrentGameScene();

    const isInTheSameMap = user.playUri === roomUrl;

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

    let loadingDirectRoomAccess = false;

    const openChat = async () => {
        let room: ChatRoom | undefined = chatConnection.getDirectRoomFor(user.id);
        if (!room)
            try {
                loadingDirectRoomAccess = true;
                room = await chatConnection.createDirectRoom(user.id);
            } catch (error) {
                console.error(error);
            } finally {
                loadingDirectRoomAccess = false;
            }

        if (!room) return;

        if (room.myMembership === "invite") room.joinRoom();

        selectedRoom.set(room);
        navChat.set("chat");
    };
</script>

<div class="wa-dropdown">
    <button class="tw-text-light-purple focus:outline-none tw-m-0" on:click|stopPropagation={openChatUserMenu}>
        <IconDots />
    </button>
    <!-- on:mouseleave={closeChatUserMenu} -->
    <div
        class={`wa-dropdown-menu tw-fixed tw-mr-1`}
        class:tw-invisible={!chatMenuActive}
        on:mouseleave={closeChatUserMenu}
    >
        {#if user.roomName}
            {#if isInTheSameMap}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span
                    class="walk-to wa-dropdown-item"
                    on:click|stopPropagation={() => goTo("user", user.playUri ?? "", user.uuid ?? "")}
                    ><img class="noselect" src={walk} alt="Walk to logo" height="13" width="13" />
                    {$LL.chat.userList.walkTo()}</span
                >
            {:else}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <span
                    class="teleport wa-dropdown-item"
                    on:click|stopPropagation={() => goTo("room", user.playUri ?? "", user.uuid ?? "")}
                    ><img class="noselect" src={teleport} alt="Teleport to logo" height="13" width="13" />
                    {$LL.chat.userList.teleport()}</span
                >
            {/if}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            {#if user.visitCardUrl}
                <span
                    class="businessCard wa-dropdown-item"
                    on:click|stopPropagation={() => showBusinessCard(user.visitCardUrl)}
                    ><img class="noselect" src={businessCard} alt="Business card" height="13" width="13" />
                    {$LL.chat.userList.businessCard()}</span
                >
            {/if}
        {/if}

        {#if user.id && !loadingDirectRoomAccess}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span class="sendMessage wa-dropdown-item" on:click|stopPropagation={openChat}
                ><IconMessage font-size="13" />
                {$LL.chat.userList.sendMessage()}</span
            >
        {:else if loadingDirectRoomAccess}
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
