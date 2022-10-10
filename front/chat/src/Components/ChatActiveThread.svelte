<script lang="ts">
    import { fly } from "svelte/transition";
    import { MucRoom } from "../Xmpp/MucRoom";
    import ChatActiveMucRoom from "./ChatActiveMucRoom.svelte";
    import ChatActiveSingleRoom from "./ChatActiveSingleRoom.svelte";

    export let activeThread: MucRoom;
</script>

<!-- thread -->
<div
    id="activeThread"
    class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-w-full"
    transition:fly={{ x: 500, duration: 400 }}
>
    {#if activeThread instanceof MucRoom}
        <ChatActiveMucRoom mucRoom={activeThread}/>
    {:else}
        <ChatActiveSingleRoom singleRoom={activeThread}/>
    {/if}
</div>
