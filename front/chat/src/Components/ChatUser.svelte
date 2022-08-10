<script lang="ts">
    import highlightWords from "highlight-words";
    import { MoreHorizontalIcon, ShieldOffIcon, ShieldIcon, SlashIcon } from "svelte-feather-icons";
    import LL from "../i18n/i18n-svelte";
    import { createEventDispatcher } from "svelte";
    import { defaultColor, defaultWoka, MeStore, User } from "../Xmpp/MucRoom";
    import walk from "../../public/static/images/walk.svg";
    import teleport from "../../public/static/images/teleport.svg";
    import { GoTo, RankUp, RankDown, Ban } from "../Type/CustomEvent";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";

    const dispatch = createEventDispatcher<{
        goTo: GoTo;
        rankUp: RankUp;
        rankDown: RankDown;
        ban: Ban;
    }>();

    export let user: User;
    export let openChat: Function;
    export let searchValue: string = "";
    export let meStore: MeStore;
    export let jid: string;

    $: presenseStore = mucRoomsStore.getDefaultRoom().getPresenceStore();

    let chatMenuActive = false;
    let openChatUserMenu = () => {
        chatMenuActive = true;
    };
    let closeChatUserMenu = () => {
        chatMenuActive = false;
    };
    function goTo(type: string, playUri: string, uuid: string) {
        dispatch("goTo", { type, playUri, uuid });
    }
    function rankUp(jid: string) {
        dispatch("rankUp", { jid });
    }
    function rankDown(jid: string) {
        dispatch("rankDown", { jid });
    }
    function ban(user: string, name: string, playUri: string) {
        dispatch("ban", { user, name, playUri });
    }

    function findUserInDefault(name: string): User | undefined {
        const userData = [...$presenseStore].find(([, user]) => user.name === name);
        let user = undefined;
        if (userData) {
            [, user] = userData;
        }
        return user;
    }

    function getWoka(name: string) {
        const user = findUserInDefault(name);
        if (user) {
            return user.woka;
        } else {
            return defaultWoka;
        }
    }

    function getColor(name: string) {
        const user = findUserInDefault(name);
        if (user) {
            return user.color;
        } else {
            return defaultColor;
        }
    }

    $: chunks = highlightWords({
        text: user.name.match(/\[\d*]/) ? user.name.substring(0, user.name.search(/\[\d*]/)) : user.name,
        query: searchValue,
    });
</script>

<div class={`wa-chat-item`} on:click|stopPropagation={() => openChat(user)} on:mouseleave={closeChatUserMenu}>
    <div
        class={`tw-relative wa-avatar ${user.active ? "" : "tw-opacity-50"}`}
        style={`background-color: ${getColor(user.name)}`}
        on:click|stopPropagation={() => openChat(user)}
    >
        <div class="wa-container">
            <img class="tw-w-full" src={getWoka(user.name)} alt="Avatar" />
        </div>
        {#if user.active}
            <span
                class="tw-w-4 tw-h-4 tw-bg-pop-green tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple"
            />
        {/if}
    </div>
    <div class={`tw-flex-auto tw-ml-3`} on:click|stopPropagation={() => openChat(user)}>
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
                <span class="tw-text-orange">
                    <ShieldIcon size="13" />
                </span>
            {/if}
        </h1>
        <p class="tw-text-xs tw-mb-0 tw-font-condensed">
            {#if user.isMe}
                {$LL.you()}
            {:else if user.active}
                {user.isInSameMap ? $LL.userList.isHere() : $LL.userList.isOverThere()}
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
                        class="wa-dropdown-item"
                        on:click|stopPropagation={() => goTo("user", user.playUri, user.uuid)}
                        ><img class="noselect" src={walk} alt="Walk to logo" height="13" width="13" />
                        {$LL.userList.walkTo()}</span
                    >
                {:else}
                    <span
                        class="wa-dropdown-item"
                        on:click|stopPropagation={() => goTo("room", user.playUri, user.uuid)}
                        ><img class="noselect" src={teleport} alt="Teleport to logo" height="13" width="13" />
                        {$LL.userList.teleport()}</span
                    >
                {/if}
                {#if $meStore.isAdmin}
                    <span
                        class="wa-dropdown-item tw-text-pop-red"
                        on:click|stopPropagation={() => ban(jid, user.name, user.playUri)}
                        ><SlashIcon size="13" /> {$LL.ban.title()}</span
                    >
                    {#if user.isAdmin}
                        <span class="wa-dropdown-item tw-text-orange" on:click|stopPropagation={() => rankDown(jid)}
                            ><ShieldOffIcon size="13" /> {$LL.rankDown()}</span
                        >
                    {:else}
                        <span class="wa-dropdown-item tw-text-orange" on:click|stopPropagation={() => rankUp(jid)}
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
