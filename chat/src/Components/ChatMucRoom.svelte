<script lang="ts">
    import { MoreHorizontalIcon, RefreshCwIcon, EyeIcon } from "svelte-feather-icons";
    import highlightWords from "highlight-words";
    import { LL } from "../i18n/i18n-svelte";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { activeThreadStore } from "../Stores/ActiveThreadStore";
    import OnlineUsers from "./OnlineUsers.svelte";

    export let mucRoom: MucRoom;
    export let searchValue: string;

    function open() {
        activeThreadStore.set(mucRoom);
    }

    let forumMenuActive = false;
    let openChatForumMenu = () => {
        forumMenuActive = true;
    };
    let closeChatUserMenu = () => {
        forumMenuActive = false;
    };

    $: chunks = highlightWords({
        text: mucRoom.name,
        query: searchValue,
    });

    const presenceStore = mucRoom.getPresenceStore();
    const me = presenceStore.get(mucRoom.myJID);
    const unreads = mucRoom.getCountMessagesToSee();
    const readyStore = mucRoom.getRoomReadyStore();
</script>

<div class="wa-chat-item flex rounded bg-contrast px-4 py-2 items-center" on:mouseleave={closeChatUserMenu}>
    <div class="relative" on:click|stopPropagation={() => open()}>
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-messages" width="36" height="36" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" />
            <path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" />
        </svg>
        <div class="block absolute right-0 top-0 transform translate-x-2 -translate-y-1">
            {#if mucRoom.type === "live"}
                <div class="block relative">
                    <span class="w-4 h-4 bg-pop-red block rounded-full absolute right-0 top-0 animate-ping" />
                    <span class="w-3 h-3 bg-pop-red block rounded-full absolute right-0.5 top-0.5" />
                </div>
            {/if}
        </div>
    </div>
    <div class="flex-auto ml-2" on:click|stopPropagation={() => open()}>
        <div class="text-lg font-bold mb-0">
            {#each chunks as chunk (chunk.key)}
                <span class={`${chunk.match ? "text-light-blue" : ""}`}>{chunk.text}</span>
            {/each}
        </div>
        {#if $readyStore}
            <OnlineUsers {presenceStore} />
        {:else}
            <div class={`text-xs text-lighter-purple mt-0 animate-pulse`}>
                {$LL.loading()} ...
            </div>
        {/if}
    </div>

    {#if $unreads}
        <span
            class="bg-pop-red text-white w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded animate-pulse"
        >
            {$unreads}
        </span>
    {/if}

    <div class="wa-dropdown">
        <!-- toggle -->
        <button class="text-light-purple m-0" on:click={openChatForumMenu}>
            <MoreHorizontalIcon />
        </button>

        <!-- menu -->
        <div class={`wa-dropdown-menu ${forumMenuActive ? "" : "invisible"}`} on:mouseleave={closeChatUserMenu}>
            <span class="open wa-dropdown-item" on:click|stopPropagation={() => open()}
                ><EyeIcon size="12" class="mr-1" /> {$LL.open()}
            </span>
            {#if $me && $me.isAdmin}
                <span class="wa-dropdown-item text-pop-red" on:click|stopPropagation={() => mucRoom.reInitialize()}
                    ><RefreshCwIcon size="13" class="mr-1" /> {$LL.reinit()}</span
                >
            {/if}
            <!--<div class="wa-dropdown-item">Delete forum</div>-->
        </div>
    </div>
</div>
