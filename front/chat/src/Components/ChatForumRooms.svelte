<script lang="ts">
    import { fly } from "svelte/transition";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import ChatMucRoom from "./ChatMucRoom.svelte";
    import { derived } from "svelte/store";
    import { showForumsStore } from "../Stores/ChatStore";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";

    export let searchValue: string;

    const forumRooms =
        [...$mucRoomsStore].filter(
            (mucRoom) => mucRoom.type === "forum" && mucRoom.name.toLowerCase().includes(searchValue)
        ) || [];

    const unread = derived(
        forumRooms.map((forum) => forum.getCountMessagesToSee()),
        ($unread) => $unread.reduce((sum, number) => sum + number, 0)
    );
</script>

<div
    id="forumRooms"
    class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
    transition:fly={{ y: -30, duration: 100 }}
>
    <div
        class="tw-px-4 tw-py-1 tw-flex tw-items-center tw-cursor-pointer"
        on:click|stopPropagation={() => showForumsStore.set(!$showForumsStore)}
    >
        {#if $unread > 0}
            <span
                class="tw-bg-pop-red tw-text-white tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded tw-animate-pulse"
            >
                {$unread}
            </span>
        {/if}
        <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Forums</p>
        <button class="tw-text-lighter-purple">
            <ChevronUpIcon class={`tw-transform tw-transition ${$showForumsStore ? "" : "tw-rotate-180"}`} />
        </button>
    </div>
    {#if $showForumsStore}
        <div transition:fly={{ y: -30, duration: 100 }}>
            {#each forumRooms as forumRoom}
                <ChatMucRoom mucRoom={forumRoom} {searchValue} />
            {/each}
        </div>
    {/if}
</div>
