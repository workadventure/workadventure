<script lang="ts">
    import { ComponentType, createEventDispatcher } from "svelte";
    import { derived } from "svelte/store";
    import { ChatMessage, ChatMessageType } from "../../Connection/ChatConnection";
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import Avatar from "../Avatar.svelte";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import MessageOptions from "./MessageOptions.svelte";
    import MessageImage from "./Message/MessageImage.svelte";
    import MessageText from "./Message/MessageText.svelte";
    import MessageFile from "./Message/MessageFile.svelte";
    import MessageAudioFile from "./Message/MessageAudioFile.svelte";
    import MessageVideoFile from "./Message/MessageVideoFile.svelte";
    import MessageEdition from "./MessageEdition.svelte";
    import MessageReactions from "./MessageReactions.svelte";
    import MessageIncoming from "./Message/MessageIncoming.svelte";
    import MessageOutcoming from "./Message/MessageOutcoming.svelte";
    import { IconTrash } from "@wa-icons";

    export let message: ChatMessage;
    export let replyDepth = 0;

    let messageRef: HTMLDivElement | undefined;

    const dispatch = createEventDispatcher<{
        updateMessageBody: { id: string };
    }>();

    const {
        id,
        sender,
        isMyMessage,
        date,
        content,
        quotedMessage,
        isQuotedMessage,
        type,
        isDeleted,
        isModified,
        reactions,
    } = message;

    const updateMessageBody = () => {
        dispatch("updateMessageBody", {
            id: message.id,
        });
    };

    const messageFromSystem = type === "incoming" || type === "outcoming";

    const messageType: { [key in ChatMessageType]: ComponentType } = {
        image: MessageImage as ComponentType,
        text: MessageText as ComponentType,
        file: MessageFile as ComponentType,
        audio: MessageAudioFile as ComponentType,
        video: MessageVideoFile as ComponentType,
        incoming: MessageIncoming as ComponentType,
        outcoming: MessageOutcoming as ComponentType,
        proximity: MessageText as ComponentType,
    };

    const reactionsWithUsers = derived(
        [reactions, ...Array.from(reactions.values()).map((reaction) => reaction.users)],
        ([$reactions, ...$users]) => {
            return Array.from($reactions.values()).filter((reaction) => reaction.users.size > 0);
        }
    );
</script>

<div
    id="message"
    tabindex="-1"
    class={`${isMyMessage && "self-end flex-row-reverse relative"} ${
        messageFromSystem && "justify-center"
    } select-text block-user-action messageContainer items-center`}
    bind:this={messageRef}
>
    <div
        style={replyDepth === 0 ? "max-width: calc( 100% - 50px );" : "padding-left: 0"}
        class="message-grid container-grid justify-start overflow-visible relative {replyDepth === 0
            ? 'max-w-[calc(100% - 100px)]'
            : ''} {!$isDeleted ? 'group-hover/message:pb-4' : ''} {isMyMessage
            ? 'justify-end grid-container-inverted pr-4'
            : 'justify-start pl-3'}"
    >
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined && replyDepth === 0}
            <div class="avatar pt-1.5">
                <Avatar avatarUrl={sender?.avatarUrl} fallbackName={sender?.username} />
            </div>
        {/if}

        <div
            class="message rounded-md
                    {$isDeleted && !isMyMessage && !messageFromSystem && replyDepth === 0 ? 'bg-white/10' : ''}
                    {$isDeleted && isMyMessage && !messageFromSystem && replyDepth === 0 ? 'bg-white/10' : ''}
                    {!isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0 ? 'bg-contrast' : ''}
                    {isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0 ? 'bg-secondary' : ''}
                    {$reactionsWithUsers.length > 0 && !$isDeleted && replyDepth === 0 ? 'mb-4 p-0.5' : ''}
                    {!isQuotedMessage ? 'my' : ''}"
        >
            {#if $isDeleted}
                <p class="py-2 px-2 m-0 text-xs flex items-center italic gap-2 opacity-50">
                    <IconTrash font-size={12} />
                    {$LL.chat.messageDeleted()}
                </p>
            {:else if $selectedChatMessageToEdit !== null && $selectedChatMessageToEdit.id === id}
                <MessageEdition message={$selectedChatMessageToEdit} />
            {:else}
                {#if replyDepth > 0}
                    <div class="px-2 pt-1 text-xxs font-bold">{isMyMessage ? "You" : sender?.username}</div>
                {/if}

                <svelte:component this={messageType[type]} on:updateMessageBody={updateMessageBody} {content} />

                {#if $reactionsWithUsers.length > 0}
                    <MessageReactions
                        classes={isMyMessage ? "bg-secondary/30 right-2" : "bg-contrast/30"}
                        reactions={$reactionsWithUsers}
                    />
                {/if}
                {#if $isModified}
                    <div class="text-white/50 text-xxs p-0 m-0 px-2 pb-1 text-right">
                        ({$LL.chat.messageEdited()})
                    </div>
                {/if}
            {/if}

            {#if quotedMessage && replyDepth < 1 && !$isDeleted}
                <div class="p-1 opacity-80">
                    <div class="response bg-white/10 rounded">
                        <svelte:self replyDepth={replyDepth + 1} message={quotedMessage} />
                    </div>
                </div>
            {/if}
        </div>
        {#if replyDepth <= 0}
            <div
                class="messageHeader w-full absolute bottom-0 h-fit group-hover/message:translate-y-[2px] opacity-0 group-hover/message:opacity-100 left-0 text-gray-500 text-xxs px-2 flex justify-between items-end gap-2"
                class:flex-row-reverse={isMyMessage}
                hidden={isQuotedMessage || messageFromSystem}
            >
                <span
                    hidden={messageFromSystem}
                    class="text-white text-nowrap {!isMyMessage ? 'text-white font-bold' : ''}"
                    >{isMyMessage ? "You" : sender?.username}</span
                >
                <span class={`text-xxs text-nowrap ${isMyMessage ? "mr-1" : "ml-1"}`}
                    >{date?.toLocaleTimeString($locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}</span
                >
                <span class={`text-xxs text-nowrap ${isMyMessage ? "mr-1" : "ml-1"}`}
                    >{date?.toLocaleDateString($locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}</span
                >
            </div>
        {/if}
        {#if !isQuotedMessage && !$isDeleted && message.type !== "proximity" && message.type !== "incoming" && message.type !== "outcoming" && ($selectedChatMessageToEdit === null || $selectedChatMessageToEdit.id !== id)}
            <div
                class="options absolute top-0 z-50 bg-contrast/80 rounded p-1 -translate-y-2/3 {!isMyMessage
                    ? 'right-0 translate-x-1/3'
                    : 'left-0 -translate-x-1/3'}"
            >
                <MessageOptions {message} {messageRef} />
            </div>
        {/if}
    </div>
</div>

<style>
    #message {
        display: flex;
        align-items: flex-start;
        position: relative;
    }

    #message:hover .options {
        display: flex;
        flex-direction: row;
        gap: 2px;
        transition-delay: 0.5s;
        opacity: 1;
    }

    .options {
        transition: all 0.2s ease-in-out;
        opacity: 0;
    }

    .container-grid {
        overflow: visible;
        display: grid;
        grid-gap: 4px;
        grid-template-areas: "avatar message" ". response" ". messageHeader";
    }

    .messageHeader {
        grid-area: messageHeader;
        transition: all 0.2s ease-in-out 0s;
    }

    .message {
        grid-area: message;
        min-width: 180px;
        overflow-wrap: anywhere;
        position: relative;
        transition: all 0.2s ease-in-out 0s;
    }

    .message.my:hover {
        transform: translateY(-6px);
        transition-delay: 0.5s;
    }
    .message.my:hover + .messageHeader {
        transform: translateY(2px);
        transition-delay: 0.5s;
        opacity: 1;
    }

    .avatar {
        grid-area: avatar;
        display: flex;
        /*align-items: flex-end;*/
    }

    .response {
        grid-area: response;
    }
</style>
