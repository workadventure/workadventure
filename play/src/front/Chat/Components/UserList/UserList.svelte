<script lang="ts">
    import User from "./User.svelte";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { chatSearchBarValue } from "../../Stores/ChatStore";

    export let userList : Array<ChatUser> = [];

    const me : ChatUser|null = userList.reduce((acc : ChatUser | null,curr)=>{
        if(acc!==null || curr.id !== localUserStore.getChatId())return acc;
        return curr;
    },null);


    $: filteredAndSortedUserList = [...userList?.filter((user : ChatUser)=> (me)? user.id!==me.id : true).sort((a : ChatUser,b : ChatUser)=>a.username?.localeCompare(b.username||"")||-1)] || [];

</script>

    {#if me && me.username?.toLocaleLowerCase().includes($chatSearchBarValue)}
        <User user={me} />
    {/if}

    {#each [...filteredAndSortedUserList] as user (user.id)}
        <User {user} />
    {/each}
