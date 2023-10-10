<script lang="ts">
    import { MucRoom } from "../Xmpp/MucRoom";
    import { showChatZonesStore } from "../Stores/ChatStore";
    import ChatMucRoom from "./ChatMucRoom.svelte";

    export let chatZones: MucRoom[];
    export let searchValue: string;
</script>

{#if chatZones.length > 0}
    <div id="chatZones" class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
        <div
            class="tw-px-4 tw-py-1 tw-flex tw-items-center tw-cursor-pointer"
            on:click|stopPropagation={() => showChatZonesStore.set(!$showChatZonesStore)}
        >
            <span
                class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
            >
                {chatZones.length}
            </span>
            <p class="tw-text-light-blue tw-my-2 tw-text-sm tw-flex-auto">Chat zones</p>
            <!--<button class="tw-text-lighter-purple">
                <ChevronUpIcon class={`tw-transform tw-transition ${$showLivesStore ? "" : "tw-rotate-180"}`} />
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
