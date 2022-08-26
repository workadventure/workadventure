<script lang="ts">
    import { MeStore, MucRoom, User, UsersStore } from "../Xmpp/MucRoom";
    import ChatUser from "./ChatUser.svelte";
    import { createEventDispatcher } from "svelte";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import LL from "../i18n/i18n-svelte";
    import { Ban, GoTo, RankDown, RankUp } from "../Type/CustomEvent";
    const dispatch = createEventDispatcher<{
        goTo: GoTo;
        rankUp: RankUp;
        rankDown: RankDown;
        ban: Ban;
        showUsers: undefined;
    }>();

    export let mucRoom: MucRoom;
    export let usersListStore: UsersStore;
    export let meStore: MeStore;
    export let showUsers: boolean;
    export let searchValue: string;

    let minimizeUser = true;
    const maxUsersMinimized = 7;

    function openChat(user: User) {
        return user;
        //dispatch('activeThread', user);
    }

    function showInviteMenu() {
        window.parent.postMessage({ type: "closeChat" }, "*");
        window.parent.postMessage({ type: "openInviteMenu" }, "*");
    }

    $: usersList = [...$usersListStore.values()] as Array<User>;
    $: me = usersList.find((user) => user.isMe);
    $: meArray = me ? [me] : [];

    $: usersFiltered = meArray
        .concat(
            usersList
                .filter((user) => user.active && !user.isMe && user.name.toLocaleLowerCase().includes(searchValue))
                .sort((a, b) => a.name.localeCompare(b.name))
                .concat(
                    usersList
                        .filter(
                            (user) => !user.active && !user.isMe && user.name.toLocaleLowerCase().includes(searchValue)
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                )
        )
        .splice(0, minimizeUser ? maxUsersMinimized : usersList.length);
</script>

<div id="users" class="users tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
    <div class="tw-px-4 tw-py-1 tw-flex tw-items-center">
        <span
            class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
        >
            {usersList.filter((user) => user.active).length}
        </span>
        <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
            {$LL.users()}
        </p>
        <button class="tw-text-lighter-purple" on:click={() => dispatch("showUsers")}>
            <ChevronUpIcon class={`tw-transform tw-transition ${showUsers ? "" : "tw-rotate-180"}`} />
        </button>
    </div>
    {#if showUsers}
        <div transition:fly={{ y: -30, duration: 100 }}>
            {#if usersList.length === 0}
                <div class="tw-px-5 tw-mb-2">
                    <p>{$LL.roomEmpty()}</p>
                    <button type="button" class="light tw-m-auto tw-cursor-pointer tw-px-3" on:click={showInviteMenu}>
                        {$LL.invite()}
                    </button>
                </div>
            {:else}
                {#each usersFiltered as user}
                    <ChatUser
                        {mucRoom}
                        {openChat}
                        {user}
                        on:goTo={(event) => dispatch("goTo", event.detail)}
                        on:rankUp={(event) => dispatch("rankUp", event.detail)}
                        on:rankDown={(event) => dispatch("rankDown", event.detail)}
                        on:ban={(event) => dispatch("ban", event.detail)}
                        {searchValue}
                        {meStore}
                    />
                {/each}
            {/if}
            {#if [...$usersListStore].length > maxUsersMinimized}
                <div class="tw-px-2 tw-mb-1  tw-flex tw-justify-end" on:click={() => (minimizeUser = !minimizeUser)}>
                    <button class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline">
                        {$LL.see()}
                        {minimizeUser ? $LL.more() : $LL.less()} …
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>
