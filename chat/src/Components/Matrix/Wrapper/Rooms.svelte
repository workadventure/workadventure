<script lang="ts">
    import { chatConnectionManager } from "../../../Connection/ChatConnectionManager";
    import Line from "./Line.svelte";
    import { get } from "svelte/store";

    const rooms = chatConnectionManager.connectionOrFail.rooms.sort(
        (a, b) => get(b.room).getLastActiveTimestamp() - get(a.room).getLastActiveTimestamp()
    );
</script>

<div class="rooms">
    {#each $rooms as room}
        <Line roomWrapper={room} />
    {/each}
</div>

<style lang="scss">
    .rooms {
        @apply tw-gap-y-0.5 tw-flex tw-flex-col tw-py-2;
    }
</style>
