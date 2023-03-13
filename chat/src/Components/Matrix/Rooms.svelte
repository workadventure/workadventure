<script lang="ts">
    import {chatConnectionManager} from "../../Connection/ChatConnectionManager";
    import Line from "./Line.svelte";

    const rooms = chatConnectionManager.connectionOrFail.rooms;
</script>
{#each $rooms as room}
    <Line room={room} />
{/each}