<script lang="ts">
    import { ChatUser } from "../../Connection/ChatConnection";
    import User from "./User.svelte";

    export let userList: Array<ChatUser> = [];
</script>

{#each userList as user (user.spaceId ?? user.id)}
    <User {user} />
{/each}
