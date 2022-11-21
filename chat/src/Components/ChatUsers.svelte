<script lang="ts">
    import { fly } from "svelte/transition";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import { singleRoomsStore } from "../Stores/SingleRoomsStore";
    import { showChatUsersStore } from "../Stores/ChatStore";
    import { derived } from "svelte/store";
    import ChatUser from "./ChatUser.svelte";

    export let searchValue: string;

    const unread = derived(
        [...$singleRoomsStore].map((singleRoom) => singleRoom.getCountMessagesToSee()),
        ($unread) => $unread.reduce((sum, number) => sum + number, 0)
    );
</script>

{#if $singleRoomsStore.size > 0}
    <div
        id="forumRooms"
        class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
        transition:fly={{ x: -30, duration: 50 }}
    >
        <div
            class="tw-px-4 tw-py-1 tw-flex tw-items-center tw-cursor-pointer"
            on:click|stopPropagation={() => showChatUsersStore.set(!$showChatUsersStore)}
        >
            {#if $unread > 0}
                <span
                    class="tw-bg-pop-red tw-text-white tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded tw-animate-pulse"
                >
                    {$unread}
                </span>
            {/if}
            <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Chat</p>
            <button class="tw-text-lighter-purple">
                <ChevronUpIcon class={`tw-transform tw-transition ${$showChatUsersStore ? "" : "tw-rotate-180"}`} />
            </button>
        </div>
        {#if $showChatUsersStore}
            <div transition:fly={{ y: -30, duration: 100 }}>
                {#each [...$singleRoomsStore.values()] as singleRoom}
                    <ChatUser mucRoom={singleRoom} user={singleRoom.user} {searchValue} />
                {/each}
            </div>
        {/if}
    </div>
{/if}
