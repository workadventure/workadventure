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
            class="px-8 flex items-center"
            on:click|stopPropagation={() => showChatZonesStore.set(!$showChatZonesStore)}
        >
            <span
                class="bg-success text-dark min-w-[20px] h-5 mr-3 text-xs font-bold flex items-center justify-center rounded-full"
            >
                {chatZones.length}
            </span>
            <p class="font-title font-lg uppercase opacity-50">Chat zones</p>
            <!--<button class="text-lighter-purple">
                <ChevronUpIcon class={`transform transition ${$showLivesStore ? "" : "rotate-180"}`} />
            </button>
            -->
        </div>
        <div class="px-4 pb-4">
            {#each chatZones as chatZone (chatZone.url)}
                <ChatMucRoom mucRoom={chatZone} {searchValue} />
            {/each}
        </div>
    </div>
{/if}
