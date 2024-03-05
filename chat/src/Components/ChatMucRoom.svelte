<script lang="ts">
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

    $: chunks = highlightWords({
        text: mucRoom.name,
        query: searchValue,
    });

    const presenceStore = mucRoom.getPresenceStore();
    const unreads = mucRoom.getCountMessagesToSee();
    const readyStore = mucRoom.getRoomReadyStore();
</script>

<div
    class="wa-chat-item flex rounded bg-white/10 transition-all hover:bg-white/20 pl-4 py-2 pr-2 mb-2 items-center cursor-pointer"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="relative" on:click|stopPropagation={() => open()}>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-messages"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10" />
            <path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2" />
        </svg>
        <div class="block absolute right-0 top-0 transform translate-x-2 -translate-y-1">
            {#if mucRoom.type === "live"}
                <div class="block relative">
                    <span class="w-4 h-4 bg-success block rounded-full absolute right-0 top-0 animate-ping" />
                    <span class="w-3 h-3 bg-success block rounded-full absolute right-0.5 top-0.5" />
                </div>
            {/if}
        </div>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="flex-auto ml-4 grow" on:click|stopPropagation={() => open()}>
        <div class="text-lg font-bold mb-0 leading-5">
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
        <span class="bg-secondary text-white w-6 h-6 text-xs font-bold flex items-center justify-center rounded-full">
            {$unreads}
        </span>
    {/if}

    <div class="wa-dropdown">
        <!-- toggle -->
        <button class="m-0 btn btn-white btn-ghost">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-chevron-right"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="#ffffff"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M9 6l6 6l-6 6" />
            </svg>
        </button>
    </div>
</div>
