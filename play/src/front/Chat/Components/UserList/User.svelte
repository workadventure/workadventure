<script lang="ts">
    import { ShieldIcon, UsersIcon } from "svelte-feather-icons";
    import { AvailabilityStatus } from "@workadventure/messages";
    import highlightWords from "highlight-words";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import { getColorHexOfStatus } from "../../../Utils/AvailabilityStatus";
    import { ChatRoom, ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue, navChat, selectedRoom } from "../../Stores/ChatStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import UserActionButton from "./UserActionButton.svelte";

    export let user:ChatUser;

    $: ({ id,availabilityStatus , username = "",color,isAdmin,isMember,avatarUrl } = user);

    $: isMe = (user.id===localUserStore.getChatId());

    $: userStatus = (isMe) ? availabilityStatusStore : availabilityStatus; 

    let chatConnection = gameManager.getCurrentGameScene().chatConnection;

    $: chunks = highlightWords({
        text: username.match(/\[\d*]/) ? username.substring(0, username.search(/\[\d*]/)) : username,
        query: $chatSearchBarValue,
    });

    function getNameOfAvailabilityStatus(status: AvailabilityStatus) {
        switch (status) {
            case AvailabilityStatus.ONLINE : 
                return $LL.chat.status.online();
            case AvailabilityStatus.AWAY:
                return $LL.chat.status.away();
            case AvailabilityStatus.BUSY:
                return $LL.chat.status.busy();
            case AvailabilityStatus.DO_NOT_DISTURB:
                return $LL.chat.status.do_not_disturb();
            case AvailabilityStatus.BACK_IN_A_MOMENT:
                return $LL.chat.status.back_in_a_moment();
            case AvailabilityStatus.SILENT:
            default:
                return $LL.chat.status.unavailable();
        }
    }

    const openChat = async () =>{

        if(isMe)return;

        let room : ChatRoom | undefined = chatConnection.getDirectRoomFor(id);
        if(!room) room = await chatConnection.createDirectRoom(id);

        if(!room) return;

        if(room.isInvited)room.joinRoom();

        selectedRoom.set(room)
        navChat.set("chat")
    }
    

</script>
 <!-- svelte-ignore a11y-click-events-have-key-events -->


<div 
on:click|stopPropagation={openChat}
class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center tw-justify-between hover:tw-bg-white hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-1">
   
    <div
    class={`wa-chat-item ${isAdmin ? "admin" : "user"}  tw-cursor-default`}
  
>
    <div
        class={`tw-relative wa-avatar ${!$userStatus && "tw-opacity-50"}  tw-cursor-default`}
        style={`background-color: ${color}`}

    >
        <div class="wa-container  tw-cursor-default">
            <img
                class="tw-w-full  tw-cursor-default"
                style="image-rendering: pixelated;"
                src={avatarUrl}
                alt="Avatar"
            />
        </div>
        {#if $userStatus && user.roomName}
            <span
                title={getNameOfAvailabilityStatus($userStatus)}
                class={`status tw-w-4 tw-h-4 tw-cursor-default tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1 tw-border-solid tw-border-2 tw-border-light-purple`}
                style="--color:{getColorHexOfStatus($userStatus)}"
            />
        {/if}
    </div>
    <div
    class={`tw-flex-auto tw-ml-3 ${!$userStatus && "tw-opacity-50"}  tw-cursor-default`}
    
>
    <h1 class={`tw-text-sm tw-font-bold tw-mb-0  tw-cursor-default`}>
        {#each chunks as chunk (chunk.key)}
        <span class={`${chunk.match ? "tw-text-light-blue" : ""}  tw-cursor-default`}>{chunk.text}</span>
        {/each}
        {#if username && username.match(/\[\d*]/)}
            <span class="tw-font-light tw-text-xs tw-text-gray  tw-cursor-default">
                #{username
                    .match(/\[\d*]/)
                    ?.join()
                    ?.replace("[", "")
                    ?.replace("]", "")}
            </span>
        {/if}
        {#if isAdmin}
        <span class="tw-text-warning" title={$LL.chat.role.admin()}>
            <ShieldIcon size="13" />
        </span>
    {/if}
    {#if isMember}
        <span title={$LL.chat.role.member()}>
            <UsersIcon size="13" />
        </span>
    {/if}
    </h1>
    <p class="tw-text-xs tw-mb-0 tw-font-condensed tw-opacity-75  tw-cursor-default tw-self-end">
        {#if isMe}
            {$LL.chat.you()}
        {:else if $userStatus}
            {getNameOfAvailabilityStatus($userStatus ?? 0)}
        {:else}
            {$LL.chat.userList.disconnected()}
        {/if}
    </p>
</div>
</div>
    {#if $userStatus && !isMe}
        <UserActionButton {user}/>
    {/if}
</div>

<style lang="scss">
    .status {
        background-color: var(--color);
    }
</style>