<script lang="ts">
    import walk from "../../images/walk.svg";
    import teleport from "../../images/teleport.svg";
    import businessCard from "../../images/business-cards.svg";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { scriptUtils } from "../../../Api/ScriptUtils";
    import { requestVisitCardsStore } from "../../../Stores/GameStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { IconForbid, IconMoreVertical } from "@wa-icons";

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
</script>

<div class="wa-dropdown">
    <button class="tw-text-light-purple focus:outline-none tw-m-0" on:click|stopPropagation={openChatUserMenu}>
        <IconMoreVertical />
    </button>
    <!-- on:mouseleave={closeChatUserMenu} -->
    <div class={`wa-dropdown-menu`} class:tw-invisible={!chatMenuActive} on:mouseleave={closeChatUserMenu}>
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
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        {#if iAmAdmin}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <span
                class="ban wa-dropdown-item tw-text-pop-red"
                on:click|stopPropagation={() => {
                    if (user.username && user.uuid)
                        gameManager.getCurrentGameScene().connection?.emitBanPlayerMessage(user.uuid, user.username);
                }}><IconForbid font-size="13" /> {$LL.chat.ban.title()}</span
            >
        {/if}
    </div>
</div>
