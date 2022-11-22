<script lang="ts">
    import ChatMucRoom from "./ChatMucRoom.svelte";
    import { derived } from "svelte/store";
    import { MucRoom } from "../Xmpp/MucRoom";

    export let searchValue: string;
    export let forumRooms: MucRoom[];

    const unread = derived(
        forumRooms.map((forum) => forum.getCountMessagesToSee()),
        ($unread) => $unread.reduce((sum, number) => sum + number, 0)
    );
</script>

{#if forumRooms.length > 0}
    <div id="forumRooms" class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
        <div class="tw-px-4 tw-py-1 tw-flex tw-items-center">
            {#if $unread > 0}
                <span
                    class="tw-bg-pop-red tw-text-white tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded tw-animate-pulse"
                >
                    {$unread}
                </span>
            {/if}
            <p class="tw-text-light-blue tw-text-sm tw-flex-auto tw-my-2">Forums</p>
            <!--<button class="tw-text-lighter-purple">
                <ChevronUpIcon class={`tw-transform tw-transition ${$showForumsStore ? "" : "tw-rotate-180"}`} />
            </button>-->
        </div>
        <div>
            {#each forumRooms as forumRoom}
                <ChatMucRoom mucRoom={forumRoom} {searchValue} />
            {/each}
        </div>
    </div>
{/if}
