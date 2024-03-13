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
                <div class="pb-4">
                    <span
                        class="bg-secondary text-white w-6 h-6 mr-3 text-xs font-bold flex items-center justify-center rounded-full"
                    >
                        {$unread}
                    </span>
                </div>
            {/if}
            <div class="font-title font-lg uppercase opacity-50 pb-4">Forums</div>
            <!--<button class="text-lighter-purple">
                <ChevronUpIcon class={`transform transition ${$showForumsStore ? "" : "rotate-180"}`} />
            </button>-->
        </div>
        <div class="px-4">
            {#each forums as forum (forum.url)}
                <ChatMucRoom mucRoom={forum} {searchValue} />
            {/each}
        </div>
    </div>
{/if}
