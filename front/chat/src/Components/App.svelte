<script lang="ts">
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import Chat from "./Chat.svelte";
</script>

{#if $chatVisibilityStore}
    <Chat />
{/if}
