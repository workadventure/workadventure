<script lang="ts">
    import highlightWords from "highlight-words";
    import { MoreHorizontalIcon, ShieldOffIcon, ShieldIcon, SlashIcon, UsersIcon } from "svelte-feather-icons";
    import LL from "../i18n/i18n-svelte";
    import { createEventDispatcher } from "svelte";
    import { defaultColor, defaultWoka, MeStore, MucRoom, User } from "../Xmpp/MucRoom";
    import walk from "../../public/static/images/walk.svg";
    import teleport from "../../public/static/images/teleport.svg";
    import { GoTo, RankUp, RankDown, Ban } from "../Type/CustomEvent";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { ENABLE_OPENID } from "../Enum/EnvironmentVariable";

    const dispatch = createEventDispatcher<{
        goTo: GoTo;
        rankUp: RankUp;
        rankDown: RankDown;
        ban: Ban;
    }>();

    export let mucRoom: MucRoom;
    export let user: User;
    export let openChat: Function;
    export let searchValue: string = "";
    export let meStore: MeStore;

    $: presenseStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();

    let chatMenuActive = false;
    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };
    function goTo(type: string, playUri: string, uuid: string) {
        dispatch("goTo", { type, playUri, uuid });
        closeChatUserMenu();
    }
    function rankUp(jid: string) {
        dispatch("rankUp", { jid });
        closeChatUserMenu();
    }
    function rankDown(jid: string) {
        dispatch("rankDown", { jid });
        closeChatUserMenu();
    }
    function ban(user: string, name: string, playUri: string) {
        dispatch("ban", { user, name, playUri });
        closeChatUserMenu();
    }

    function findUserInDefault(jid: string): User | undefined {
        const userData = [...$presenseStore].find(([, user]) => user.jid === jid);
        let user = undefined;
        if (userData) {
            [, user] = userData;
        }
        return user;
    }

    function getWoka(jid: string) {
        const user = findUserInDefault(jid);
        if (user) {
            return user.woka;
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

<div
    class={`wa-chat-item ${user.isAdmin ? "admin" : "user"}`}
    on:click|stopPropagation={() => openChat(user)}
    on:mouseleave={closeChatUserMenu}
>
    <div
        class={`tw-relative wa-avatar ${!user.active && "tw-opacity-50"}`}
        style={`background-color: ${getColor(user.jid)}`}
        on:click|stopPropagation={() => openChat(user)}
    >
        <div class="wa-container">
            <img class="tw-w-full" src={getWoka(user.jid)} alt="Avatar" />
        </div>
        {#if user.active}
            <span
                title={getNameOfAvailabilityStatus(user.availabilityStatus)}
                class={`tw-w-4 tw-h-4 ${getColorOfAvailabilityStatus(
                    user.availabilityStatus
                )} tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple`}
            />
        {/if}
    </div>
    <div
        class={`tw-flex-auto tw-ml-3 ${!user.active && "tw-opacity-50"}`}
        on:click|stopPropagation={() => openChat(user)}
    >
        <h1 class={`tw-text-sm tw-font-bold tw-mb-0`}>
            {#each chunks as chunk (chunk.key)}
                <span class={`${chunk.match ? "tw-text-light-blue" : ""}`}>{chunk.text}</span>
            {/each}
            {#if user.name.match(/\[\d*]/)}
                <span class="tw-font-light tw-text-xs tw-text-gray">
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
        <p class="tw-text-xs tw-mb-0 tw-font-condensed">
            {#if user.isMe}
                {$LL.you()}
            {:else if user.active}
                {user.isInSameMap
                    ? $LL.userList.isHere()
                    : user.roomName
                    ? `${$LL.userList.in()} "${user.roomName}"`
                    : $LL.inAnotherMap()}
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
                        on:click|stopPropagation={() => goTo("user", user.playUri, user.uuid)}
                        ><img class="noselect" src={walk} alt="Walk to logo" height="13" width="13" />
                        {$LL.userList.walkTo()}</span
                    >
                {:else}
                    <span
                        class="teleport wa-dropdown-item"
                        on:click|stopPropagation={() => goTo("room", user.playUri, user.uuid)}
                        ><img class="noselect" src={teleport} alt="Teleport to logo" height="13" width="13" />
                        {$LL.userList.teleport()}</span
                    >
                {/if}
                {#if $meStore.isAdmin}
                    <span
                        class="ban wa-dropdown-item tw-text-pop-red"
                        on:click|stopPropagation={() => ban(user.jid, user.name, user.playUri)}
                        ><SlashIcon size="13" /> {$LL.ban.title()}</span
                    >
                    {#if user.isAdmin}
                        <span
                            class="rank-down wa-dropdown-item tw-text-orange"
                            on:click|stopPropagation={() => rankDown(user.jid)}
                            ><ShieldOffIcon size="13" /> {$LL.rankDown()}</span
                        >
                    {:else}
                        <span
                            class="rank-up wa-dropdown-item tw-text-orange"
                            on:click|stopPropagation={() => rankUp(user.jid)}
                            ><ShieldIcon size="13" /> {$LL.rankUp()}</span
                        >
                    {/if}
                {/if}
                <!--<span class="wa-dropdown-item" on:click|stopPropagation={() => openChat(user)}> Open Chat </span>
                <div class="wa-dropdown-item">Delete chat</div>-->
            </div>
        </div>
    {/if}
</div>
