<script lang="ts">
    import { MucRoom } from "../Xmpp/MucRoom";
    import { showChatZonesStore } from "../Stores/ChatStore";
    import ChatMucRoom from "./ChatMucRoom.svelte";

    export let chatZones: MucRoom[];
    export let searchValue: string;
</script>

{#if chatZones.length > 0}
    <div id="chatZones" class="bg-contrast/80">
        <div
            class="px-4 py-1 flex items-center cursor-pointer"
            on:click|stopPropagation={() => showChatZonesStore.set(!$showChatZonesStore)}
        >
            <span
                class="bg-light-blue text-dark-purple w-5 h-5 mr-3 text-sm font-semibold flex items-center justify-center rounded"
            >
                {chatZones.length}
            </span>
            <p class="text-light-blue my-2 text-sm flex-auto">Chat zones</p>
            <!--<button class="text-lighter-purple">
                <ChevronUpIcon class={`transform transition ${$showLivesStore ? "" : "rotate-180"}`} />
            </button>
            -->
        </div>
        <div>
            {#each chatZones as chatZone (chatZone.url)}
                <ChatMucRoom mucRoom={chatZone} {searchValue} />
            {/each}
        </div>
    </div>
{/if}
