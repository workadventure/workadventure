<script lang="ts">
    import { ChatUser } from "../../Connection/ChatConnection";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { chatSearchBarValue } from "../../Stores/ChatStore";
    import User from "./User.svelte";

    export let userList: Array<ChatUser> = [];

    const me: ChatUser | null = userList.reduce((acc: ChatUser | null, curr) => {
        if (acc !== null || curr.id !== localUserStore.getChatId()) return acc;
        return curr;
    }, null);

    $: filteredAndSortedUserList =
        [
            ...userList
                .filter((user: ChatUser) => (me ? user.spaceId !== me.spaceId : true))
                .sort((a: ChatUser, b: ChatUser) => a.username?.localeCompare(b.username || "") || -1),
        ] || [];
</script>

{#if me && me.username?.toLocaleLowerCase().includes($chatSearchBarValue)}
    <User user={me} />
{/if}

{#each [...filteredAndSortedUserList] as user (user.spaceId ?? user.id)}
    <User {user} />
{/each}
