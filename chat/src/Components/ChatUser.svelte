<script lang="ts">
    import highlightWords from "highlight-words";
    import { MoreHorizontalIcon, ShieldOffIcon, ShieldIcon, SlashIcon, UsersIcon } from "svelte-feather-icons";
    import { get } from "svelte/store";
    import { LL } from "../i18n/i18n-svelte";
    import { defaultColor, defaultWoka, User } from "../Xmpp/AbstractRoom";
    import { MucRoom } from "../Xmpp/MucRoom";
    import walk from "../../public/static/images/walk.svg";
    import teleport from "../../public/static/images/teleport.svg";
    import businessCard from "../../public/static/images/business-cards.svg";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { ENABLE_OPENID } from "../Enum/EnvironmentVariable";
    import { iframeListener } from "../IframeListener";

    export let mucRoom: MucRoom;
    export let user: User;
    export let searchValue: string = "";

    function openChat(user: User) {
        return user;
        // activeThreadStore.set(user);
    }

    const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();

    const me = presenceStore.get(mucRoom.myJID);

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
        closeChatUserMenu();
    }

    function goTo(type: string, playUri: string, uuid: string) {
        if (playUri !== "" && uuid !== "") {
            mucRoom.goTo(type, playUri, uuid);
        }
        closeChatUserMenu();
    }

    function findUserInDefault(jid: string): User | undefined {
        const userData = presenceStore.get(jid);
        let user = undefined;
        if (userData) {
            user = get(userData);
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
                return "bg-pop-green";
            case 2:
                return "bg-pop-red";
            case 3:
                return "bg-warning";
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

<!-- TODO All 'cursor-default' will be deleted when Chat 1to1 will be released -->
<div
    class="wa-chat-item relative flex items-center my-3 mx-4 {user.isAdmin ? 'admin' : 'user'}  cursor-default"
    on:click|stopPropagation={() => openChat(user)}
    on:mouseleave={closeChatUserMenu}
>
    <div
        class="relative wa-avatar aspect-ratio h-10 w-10 rounded overflow-hidden {!user.active && 'opacity-50'}  cursor-default"
        style={`background-color: ${getColor(user.jid)}`}
        on:click|stopPropagation={() => openChat(user)}
    >
        <div class="wa-container cursor-default">
            <img
                class="cursor-default w-full mt-2"
                style="image-rendering: pixelated;"
                src={getWoka(user.jid)}
                alt="Avatar"
            />
        </div>
    </div>
    {#if user.active && user.availabilityStatus}
            <span
                    title={getNameOfAvailabilityStatus(user.availabilityStatus)}
                    class={`w-4 h-4 ${getColorOfAvailabilityStatus(
                    user.availabilityStatus
                )}  cursor-default block rounded-full absolute -left-1.5 -top-1 border-solid border-2 border-contrast`}
            ></span>
    {/if}
    <div
        class="flex-auto ml-3 $cursor-default"
        on:click|stopPropagation={() => openChat(user)}
    >
        <div class={`text-sm font-bold mb-0  cursor-default`}>
            {#each chunks as chunk (chunk.key)}
                <span class={`${chunk.match ? "text-light-blue" : ""}  cursor-default`}>{chunk.text}</span>
            {/each}
            {#if user.name.match(/\[\d*]/)}
                <span class="font-light text-xs text-gray  cursor-default">
                    #{user.name
                        .match(/\[\d*]/)
                        ?.join()
                        ?.replace("[", "")
                        ?.replace("]", "")}
                </span>
            {/if}
            {#if user.isAdmin}
                <span class="text-warning" title={$LL.role.admin()}>
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
                    <span class="text-pop-red" title={$LL.role.visitor()}>
                        <UserXIcon size="13" />
                    </span>
                    -->
                {/if}
            {/if}
        </div>
        <div class="text-xs mb-0 font-condensed opacity-75  cursor-default">
            {#if user.isMe}
                {$LL.you()}
            {:else if user.active}
                {getNameOfAvailabilityStatus(user.availabilityStatus ?? 0)}
            {:else}
                {$LL.userList.disconnected()}
            {/if}
        </div>
    </div>

    {#if user.unreads}
        <span
            class="bg-light-blue text-dark-purple w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded"
        >
            {user.unreads}
        </span>
    {/if}

    {#if user.active && !user.isMe}
        <div class="wa-dropdown hidden">
            <button class="text-light-purple focus:outline-none m-0" on:click|stopPropagation={openChatUserMenu}>
                <MoreHorizontalIcon />
            </button>
            <!-- on:mouseleave={closeChatUserMenu} -->
            <div class={`wa-dropdown-menu ${chatMenuActive ? "" : "invisible"}`} on:mouseleave={closeChatUserMenu}>
                {#if user.isInSameMap}
                    <span
                        class="walk-to wa-dropdown-item"
                        on:click|stopPropagation={() => goTo("user", user.playUri ?? "", user.uuid ?? "")}
                        ><img class="noselect" src={walk} alt="Walk to logo" height="13" width="13" />
                        {$LL.userList.walkTo()}</span
                    >
                {:else}
                    <span
                        class="teleport wa-dropdown-item"
                        on:click|stopPropagation={() => goTo("room", user.playUri ?? "", user.uuid ?? "")}
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
                        class="ban wa-dropdown-item text-pop-red"
                        on:click|stopPropagation={() => mucRoom.sendBan(user.jid, user.name, user.playUri ?? "")}
                        ><SlashIcon size="13" /> {$LL.ban.title()} (coming soon)</span
                    >
                    {#if user.isAdmin}
                        <span
                            class="rank-down wa-dropdown-item text-warning"
                            on:click|stopPropagation={() => mucRoom.sendRankDown(user.jid)}
                            ><ShieldOffIcon size="13" /> {$LL.rankDown()} (coming soon)</span
                        >
                    {:else}
                        <span
                            class="rank-up wa-dropdown-item text-warning"
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
