<script lang="ts">
    import { fly } from "svelte/transition";
    import { ChevronUpIcon } from "svelte-feather-icons";
    import ChatLiveRoom from "./ChatLiveRoom.svelte";
    import { createEventDispatcher } from "svelte";
    import { MucRoom } from "../Xmpp/MucRoom";
    const dispatch = createEventDispatcher();

    export let liveRooms: MucRoom[];
    export let showLives: Boolean;
    export let searchValue: string;

    function open(liveRoom: MucRoom) {
        dispatch("activeThread", liveRoom);
    }
</script>

{#if liveRooms.length > 0}
    <div
        class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
        transition:fly={{ y: -30, duration: 100 }}
    >
        <div
            class="tw-px-4 tw-py-1 tw-flex tw-items-center tw-cursor-pointer"
            on:click|stopPropagation={() => dispatch("showLives")}
        >
            <span
                class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
            >
                {liveRooms.length}
            </span>
            <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Live zones</p>
            <button class="tw-text-lighter-purple">
                <ChevronUpIcon class={`tw-transform tw-transition ${showLives ? "" : "tw-rotate-180"}`} />
            </button>
        </div>
        {#if showLives}
            <div transition:fly={{ y: -30, duration: 100 }}>
                {#each liveRooms as liveRoom}
                    <ChatLiveRoom
                        {liveRoom}
                        {searchValue}
                        meStore={liveRoom.getMeStore()}
                        usersListStore={liveRoom.getPresenceStore()}
                        {open}
                    />
                {/each}
            </div>
        {/if}
    </div>
{/if}
