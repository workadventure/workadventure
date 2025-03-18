<script lang="ts">
    import { ChatUser } from "../../Connection/ChatConnection";
    import User from "./User.svelte";

    export let userList: Array<ChatUser> = [];
</script>

{#each userList as user (user.spaceUserId ?? user.chatId)}
    <User {user} />
{/each}
