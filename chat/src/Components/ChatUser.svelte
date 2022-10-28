<script lang="ts">
    import highlightWords from "highlight-words";
    import { MoreHorizontalIcon, ShieldOffIcon, ShieldIcon, SlashIcon, UsersIcon } from "svelte-feather-icons";
    import LL from "../i18n/i18n-svelte";
    import { defaultColor, defaultWoka } from "../Xmpp/AbstractRoom";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { User } from "../Xmpp/AbstractRoom";
    import walk from "../../public/static/images/walk.svg";
    import teleport from "../../public/static/images/teleport.svg";
    import businessCard from "../../public/static/images/business-cards.svg";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { ENABLE_OPENID } from "../Enum/EnvironmentVariable";
    import { iframeListener } from "../IframeListener";
    import { derived } from "svelte/store";

    export let mucRoom: MucRoom;
    export let user: User;
    export let searchValue: string = "";

    function openChat(user: User) {
        return user;
        // activeThreadStore.set(user);
    }

    const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();

    const me = derived(presenceStore, ($presenceStore) => $presenceStore.get(mucRoom.myJID));

    let chatMenuActive = false;
    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };

    function showBusinessCard(visitCardUrl: string | undefined) {
        if (visitCardUrl) {
            iframeListener.sendShowBusinessCard(visitCardUrl);
        }
    }

    function findUserInDefault(jid: string): User | undefined {
        const userData = [...$presenceStore].find(([, user]) => user.jid === jid);
        let user = undefined;
        if (userData) {
            [, user] = userData;
        }
        return user;
    }

    function getWoka(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.woka ?? defaultWoka;
        } else {
            return defaultWoka;
        }
    }

    function getColor(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.color;
        } else {
            return defaultColor;
        }
    }

    function getColorOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
            default:
                return "tw-bg-pop-green";
            case 2:
                return "tw-bg-pop-red";
            case 3:
                return "tw-bg-orange";
        }
    }

    function getNameOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
            default:
                return $LL.status.online();
            case 2:
                return $LL.status.away();
            case 3:
                return $LL.status.unavailable();
        }
    }

    $: chunks = highlightWords({
        text: user.name.match(/\[\d*]/) ? user.name.substring(0, user.name.search(/\[\d*]/)) : user.name,
        query: searchValue,
    });
</script>

<!-- TODO All 'tw-cursor-default' will be deleted when Chat 1to1 will be released -->
<div
    class={`wa-chat-item ${user.isAdmin ? "admin" : "user"}  tw-cursor-default`}
    on:click|stopPropagation={() => openChat(user)}
    on:mouseleave={closeChatUserMenu}
>
    <div
        class={`tw-relative wa-avatar ${!user.active && "tw-opacity-50"}  tw-cursor-default`}
        style={`background-color: ${getColor(user.jid)}`}
        on:click|stopPropagation={() => openChat(user)}
    >
        <div class="wa-container  tw-cursor-default">
            <img
                class="tw-w-full  tw-cursor-default"
                style="image-rendering: pixelated;"
                src={getWoka(user.jid)}
                alt="Avatar"
            />
        </div>
        {#if user.active && user.availabilityStatus}
            <span
                title={getNameOfAvailabilityStatus(user.availabilityStatus)}
                class={`tw-w-4 tw-h-4 ${getColorOfAvailabilityStatus(
                    user.availabilityStatus
                )}  tw-cursor-default tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple`}
            />
        {/if}
    </div>
    <div
        class={`tw-flex-auto tw-ml-3 ${!user.active && "tw-opacity-50"}  tw-cursor-default`}
        on:click|stopPropagation={() => openChat(user)}
    >
        <h1 class={`tw-text-sm tw-font-bold tw-mb-0  tw-cursor-default`}>
            {#each chunks as chunk (chunk.key)}
                <span class={`${chunk.match ? "tw-text-light-blue" : ""}  tw-cursor-default`}>{chunk.text}</span>
            {/each}
            {#if user.name.match(/\[\d*]/)}
                <span class="tw-font-light tw-text-xs tw-text-gray  tw-cursor-default">
                    #{user.name
                        .match(/\[\d*]/)
                        ?.join()
                        ?.replace("[", "")
                        ?.replace("]", "")}
                </span>
            {/if}
            {#if user.isAdmin}
                <span class="tw-text-orange" title={$LL.role.admin()}>
                    <ShieldIcon size="13" />
                </span>
            {/if}
            {#if ENABLE_OPENID}
                {#if user.isMember}
                    <span title={$LL.role.member()}>
                        <UsersIcon size="13" />
                    </span>
                    <!--
                // If it's not a member
                {:else}
                    <span class="tw-text-pop-red" title={$LL.role.visitor()}>
                        <UserXIcon size="13" />
                    </span>
                    -->
                {/if}
            {/if}
        </h1>
        <p class="tw-text-xs tw-mb-0 tw-font-condensed tw-opacity-75  tw-cursor-default">
            {#if user.isMe}
                {$LL.you()}
            {:else if user.active}
                {@html user.isInSameMap
                    ? $LL.userList.isHere()
                    : user.roomName
                    ? `${$LL.userList.in()} <span class="tw-font-medium">${user.roomName}</span>`
                    : $LL.userList.inAnotherMap()}
            {:else}
                {$LL.userList.disconnected()}
            {/if}
        </p>
    </div>

    {#if user.unreads}
        <span
            class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
        >
            {user.unreads}
        </span>
    {/if}

    {#if user.active && !user.isMe}
        <div class="wa-dropdown">
            <button class="tw-text-light-purple focus:outline-none tw-m-0" on:click|stopPropagation={openChatUserMenu}>
                <MoreHorizontalIcon />
            </button>
            <!-- on:mouseleave={closeChatUserMenu} -->
            <div class={`wa-dropdown-menu ${chatMenuActive ? "" : "tw-invisible"}`} on:mouseleave={closeChatUserMenu}>
                {#if user.isInSameMap}
                    <span
                        class="walk-to wa-dropdown-item"
                        on:click|stopPropagation={() => mucRoom.goTo("user", user.playUri ?? "", user.uuid ?? "")}
                        ><img class="noselect" src={walk} alt="Walk to logo" height="13" width="13" />
                        {$LL.userList.walkTo()}</span
                    >
                {:else}
                    <span
                        class="teleport wa-dropdown-item"
                        on:click|stopPropagation={() => mucRoom.goTo("room", user.playUri ?? "", user.uuid ?? "")}
                        ><img class="noselect" src={teleport} alt="Teleport to logo" height="13" width="13" />
                        {$LL.userList.teleport()}</span
                    >
                {/if}
                {#if user.visitCardUrl}
                    <span
                        class="businessCard wa-dropdown-item"
                        on:click|stopPropagation={() => showBusinessCard(user.visitCardUrl)}
                        ><img class="noselect" src={businessCard} alt="Business card" height="13" width="13" />
                        {$LL.userList.businessCard()}</span
                    >
                {/if}
                {#if $me && $me.isAdmin}
                    <span
                        class="ban wa-dropdown-item tw-text-pop-red"
                        on:click|stopPropagation={() => mucRoom.sendBan(user.jid, user.name, user.playUri ?? "")}
                        ><SlashIcon size="13" /> {$LL.ban.title()} (coming soon)</span
                    >
                    {#if user.isAdmin}
                        <span
                            class="rank-down wa-dropdown-item tw-text-orange"
                            on:click|stopPropagation={() => mucRoom.sendRankDown(user.jid)}
                            ><ShieldOffIcon size="13" /> {$LL.rankDown()} (coming soon)</span
                        >
                    {:else}
                        <span
                            class="rank-up wa-dropdown-item tw-text-orange"
                            on:click|stopPropagation={() => mucRoom.sendRankUp(user.jid)}
                            ><ShieldIcon size="13" /> {$LL.rankUp()} (coming soon)</span
                        >
                    {/if}
                {/if}
                <!--<span class="wa-dropdown-item" on:click|stopPropagation={() => openChat(user)}> Open Chat </span>
                <div class="wa-dropdown-item">Delete chat</div>-->
            </div>
        </div>
    {/if}
</div>
