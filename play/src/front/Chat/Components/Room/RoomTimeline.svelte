<script lang="ts">
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { get } from "svelte/store";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { proximityRoomConnection, selectedChatMessageToReply, selectedRoom } from "../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import Avatar from "../Avatar.svelte";
    import Message from "./Message.svelte";
    import MessageInput from "./MessageInput.svelte";
    import { IconArrowLeft } from "@wa-icons";

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
        if (messageListRef) {
            loadPreviousMessageOnScrollTop().catch((error) => console.error(error));
        }
    });

    beforeUpdate(() => {
        if (messageListRef) {
            const scrollableDistance = messageListRef.scrollHeight - messageListRef.offsetHeight;
            autoScroll = messageListRef.scrollTop > scrollableDistance - 20;
            onScrollTop = messageListRef.scrollTop === 0;
        }
    });

    afterUpdate(() => {
        room.setTimelineAsRead();
        const oldFirstListItem = messageListRef.querySelector<HTMLLIElement>('li[data-first-li="true"]');
        if (autoScroll) {
            scrollToMessageListBottom();
        }
        if (onScrollTop) {
            if (oldFirstListItem !== null) {
                messageListRef.scrollTop =
                    oldFirstListItem.getBoundingClientRect().top - messageListRef.getBoundingClientRect().top;
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

    $: messages = room?.messages;
    $: messageReaction = room?.messageReactions;
    $: userConnected = $proximityRoomConnection?.userConnected;
</script>

{#if room !== undefined}
    <button class="tw-p-0 tw-m-0" on:click={goBackAndClearSelectedChatMessage}>
        <IconArrowLeft />
    </button>
    <ul
        on:scroll={() => loadPreviousMessageOnScrollTop()}
        bind:this={messageListRef}
        class="tw-list-none tw-p-0 tw-flex-1 tw-overflow-auto tw-flex tw-flex-col"
    >
        {#if room.id === "proximity" && $userConnected !== undefined}
            <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
                {#each [...$userConnected] as [userId, user] (userId)}
                    <div class="avatar">
                        <Avatar
                            avatarUrl={user.avatarUrl}
                            fallbackFirstLetter={user?.username?.charAt(0)}
                            color={user?.color}
                        />
                    </div>
                {/each}
            </div>
        {/if}
        {#if $messages.length === 0}
            <p class="tw-self-center tw-text-md tw-text-gray-500">{$LL.chat.nothingToDisplay()}</p>
        {/if}
        {#each $messages as message (message.id)}
            <li data-event-id={message.id}>
                <Message {message} reactions={$messageReaction.get(message.id)} />
            </li>
        {/each}
    </ul>
    <MessageInput {room} />
{/if}
