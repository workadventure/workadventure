<script lang="ts">
    import { fly } from "svelte/transition";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import ChatMucRoom from "./ChatMucRoom.svelte";
    import { createEventDispatcher } from "svelte";
    import { MucRoom } from "../Xmpp/MucRoom";
    import {derived} from "svelte/store";
    const dispatch = createEventDispatcher();

    export let forumRooms: MucRoom[];
    export let showForums: Boolean;
    export let searchValue: string;

    function open(liveRoom: MucRoom) {
        dispatch("activeThread", liveRoom);
    }

    const unread = derived(
        forumRooms.map(forum => forum.getCountMessagesToSee()),
        $unread => $unread.reduce((sum, number) => sum + number, 0)
    );
</script>

<!--{#if forumRooms.length > 0}-->
    <div
        id="forumRooms"
        class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
        transition:fly={{ y: -30, duration: 100 }}
    >
        <div
            class="tw-px-4 tw-py-1 tw-flex tw-items-center tw-cursor-pointer"
            on:click|stopPropagation={() => dispatch("showForums")}
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
                <ChevronUpIcon class={`tw-transform tw-transition ${showForums ? "" : "tw-rotate-180"}`} />
            </button>
        </div>
        {#if showForums}
            <div transition:fly={{ y: -30, duration: 100 }}>
                {#each forumRooms as forumRoom}
                    <ChatMucRoom
                        mucRoom={forumRoom}
                        {searchValue}
                        meStore={forumRoom.getMeStore()}
                        usersListStore={forumRoom.getPresenceStore()}
                        {open}
                    />
                {/each}
            </div>
        {/if}
    </div>
<!--{/if}-->
