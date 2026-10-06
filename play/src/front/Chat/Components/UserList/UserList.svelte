<script lang="ts">
    import type { ChatUser } from "../../Connection/ChatConnection";
    import User from "./User.svelte";

    interface Props {
        userList: Array<ChatUser>;
        isMatrixChatEnabled: boolean;
    }

    let { userList = [], isMatrixChatEnabled = true }: Props = $props();
</script>

{#each userList as user (user.spaceUserId ?? user.chatId)}
    <User {user} {isMatrixChatEnabled} />
{/each}
