<script lang="ts">
    import { IconArrowLeft } from "@tabler/icons-svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { get } from "svelte/store";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply, selectedRoom } from "../../Stores/ChatStore";
    import Message from "./Message.svelte";
    import MessageInput from "./MessageInput.svelte";

    export let room: ChatRoom;

    let messageListRef: HTMLUListElement;
    let autoScroll = true;
    let onScrollTop = false;

    async function loadPreviousMessageOnScrollTop() {
        while (messageListRef.scrollTop === 0 && get(room.hasPreviousMessage)) {
            // eslint-disable-next-line no-await-in-loop
            await room.loadMorePreviousMessages();
        }
    }

    onMount(() => {
        scrollToMessageListBottom();
        room.loadMorePreviousMessages().catch(error => console.error(error));
    });

    beforeUpdate(()=>{
        if(messageListRef){
            const scrollableDistance = messageListRef.scrollHeight - messageListRef.offsetHeight;
            autoScroll = messageListRef.scrollTop > scrollableDistance - 20;
            onScrollTop = messageListRef.scrollTop === 0;
        }
    })

    afterUpdate(() => {
        room.setTimelineAsRead();
        const oldFirstListItem = messageListRef.querySelector<HTMLLIElement>("li[data-first-li=\"true\"]");
        if (autoScroll) {
            scrollToMessageListBottom();
        }
        if(onScrollTop){
            if (oldFirstListItem === null) {
                //nothing to do
            } else{
                messageListRef.scrollTop = oldFirstListItem.getBoundingClientRect().top - messageListRef.getBoundingClientRect().top;
                oldFirstListItem.removeAttribute("data-first-li");
            }
            const firstListItem = messageListRef.children.item(0);
            firstListItem?.setAttribute("data-first-li", "true");
        }
    });


    function scrollToMessageListBottom() {
        messageListRef.scrollTo(0, messageListRef.scrollHeight);
    }

    function goBackAndClearSelectedChatMessage() {
        selectedChatMessageToReply.set(null);
        selectedRoom.set(undefined);
    }

    let messages = room?.messages;
    let messageReaction = room?.messageReactions;
    
</script>

{#if room !== undefined}
    <button class="tw-p-0 tw-m-0" on:click={goBackAndClearSelectedChatMessage}>
        <IconArrowLeft />
    </button>
    <ul on:scroll={()=>loadPreviousMessageOnScrollTop()} bind:this={messageListRef}
        class="tw-list-none tw-p-0 tw-flex-1 tw-overflow-auto tw-flex tw-flex-col">
        {#if $messages.length === 0}
            <p class="tw-self-center tw-text-md tw-text-gray-500">No message</p>
        {/if}
        {#each $messages as message (message.id)}
            <li data-event-id={message.id}>
                <Message {message} reactions={$messageReaction.get(message.id)} />
            </li>
        {/each}
    </ul>
    <MessageInput room={room} />
{/if}

