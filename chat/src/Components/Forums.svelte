<script lang="ts">
    import { derived } from "svelte/store";
    import { MucRoom } from "../Xmpp/MucRoom";
    import ChatMucRoom from "./ChatMucRoom.svelte";

    export let searchValue: string;
    export let forums: MucRoom[];

    const unread = derived(
        forums.map((forum) => forum.getCountMessagesToSee()),
        ($unread) => $unread.reduce((sum, number) => sum + number, 0)
    );
</script>

{#if forums.length > 0}
    <div id="forumRooms" class="bg-contrast/80">
        <div class="px-8 flex items-center">
            {#if $unread > 0}
                <span class="bg-pop-red text-white w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded animate-pulse">
                    {$unread}
                </span>
            {/if}
            <p class="font-title font-lg uppercase opacity-50">
                Forums
            </p>
            <!--<button class="text-lighter-purple">
                <ChevronUpIcon class={`transform transition ${$showForumsStore ? "" : "rotate-180"}`} />
            </button>-->
        </div>
        <div class="px-4">
            {#each forums as forum}
                <ChatMucRoom mucRoom={forum} {searchValue} />
            {/each}
        </div>
    </div>
{/if}
