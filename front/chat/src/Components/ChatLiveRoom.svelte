<script lang="ts">
    import { MoreHorizontalIcon, RefreshCwIcon, EyeIcon } from "svelte-feather-icons";
    import OnlineUsers from "./OnlineUsers.svelte";
    import LL from "../i18n/i18n-svelte";
    import highlightWords from "highlight-words";
    import { MeStore, MucRoom, UsersStore } from "../Xmpp/MucRoom";

    export let liveRoom: MucRoom;
    export let meStore: MeStore;
    export let usersListStore: UsersStore;
    export let open: Function;
    export let searchValue: string;

    let forumMenuActive = false;
    let openChatForumMenu = () => {
        forumMenuActive = true;
    };
    let closeChatUserMenu = () => {
        forumMenuActive = false;
    };

    $: chunks = highlightWords({
        text: liveRoom.name,
        query: searchValue,
    });

    $: unreads = liveRoom.getCountMessagesToSee();
</script>

<div class={`wa-chat-item`} on:mouseleave={closeChatUserMenu}>
    <div class="tw-relative" on:click|stopPropagation={() => open(liveRoom)}>
        <img class={``} src="/static/images/logo-wa-2.png" alt="Send" width="35" />
        <div class="tw-block tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1">
            <div class="tw-block tw-relative">
                <span
                    class="tw-w-4 tw-h-4 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"
                />
                <span
                    class="tw-w-3 tw-h-3 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5"
                />
            </div>
        </div>
    </div>
    <div class="tw-flex-auto tw-ml-2" on:click|stopPropagation={() => open(liveRoom)}>
        <h1 class="tw-text-sm tw-font-bold tw-mb-0">
            {#each chunks as chunk (chunk.key)}
                <span class={`${chunk.match ? "tw-text-light-blue" : ""}`}>{chunk.text}</span>
            {/each}
        </h1>
        <OnlineUsers {usersListStore} />
    </div>

    {#if $unreads}
        <span
            class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded tw-animate-pulse"
        >
            {$unreads}
        </span>
    {/if}

    <div class="wa-dropdown">
        <!-- toggle -->
        <button class="tw-text-light-purple tw-m-0" on:click={openChatForumMenu}>
            <MoreHorizontalIcon />
        </button>

        <!-- menu -->
        <div class={`wa-dropdown-menu ${forumMenuActive ? "" : "tw-invisible"}`} on:mouseleave={closeChatUserMenu}>
            <span class="open wa-dropdown-item" on:click|stopPropagation={() => open(liveRoom)}
                ><EyeIcon size="12" class="tw-mr-1" /> {$LL.open()}
            </span>
            {#if $meStore.isAdmin}
                <span class="wa-dropdown-item tw-text-pop-red" on:click|stopPropagation={() => liveRoom.reInitialize()}
                    ><RefreshCwIcon size="13" class="tw-mr-1" /> {$LL.reinit()}</span
                >
            {/if}
            <!--<div class="wa-dropdown-item">Delete forum</div>-->
        </div>
    </div>
</div>
