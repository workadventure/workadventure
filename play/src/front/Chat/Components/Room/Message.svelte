<script lang="ts">
    import { ComponentType, createEventDispatcher } from "svelte";
    import { MapStore } from "@workadventure/store-utils";
    import { ChatMessage, ChatMessageReaction, ChatMessageType } from "../../Connection/ChatConnection";
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
    export let reactions: MapStore<string, ChatMessageReaction> | undefined;
    export let replyDepth = 0;

    const dispatch = createEventDispatcher();

    const { id, sender, isMyMessage, date, content, quotedMessage, isQuotedMessage, type, isDeleted, isModified } =
        message;

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
</script>

<div
    id="message"
    tabindex="-1"
    class={`${isMyMessage && "tw-self-end tw-flex-row-reverse tw-relative"} ${
        messageFromSystem && "tw-justify-center"
    } tw-select-text tw-group/message block-user-action messageContainer tw-items-center`}
>
    <div
        style={replyDepth === 0 ? "max-width: calc( 100% - 105px );" : "padding-left: 0"}
        class="container-grid tw-justify-start {replyDepth === 0 ? 'tw-max-w-[calc(100% - 100px)]' : ''} {!isDeleted
            ? 'group-hover/message:tw-pb-4'
            : ''} {isMyMessage ? 'tw-justify-end grid-container-inverted tw-pr-4' : 'tw-justify-start tw-pl-3'}"
    >
        <div
            class="messageHeader tw-text-gray-500 tw-text-xxs tw-p-0 tw-m-0 tw-flex tw-justify-between tw-items-end tw-opacity-0 tw-h-0 group-hover/message:tw-pt-1 group-hover/message:tw-h-auto group-hover/message:tw-opacity-100 tw-mx-2"
            class:tw-flex-row-reverse={isMyMessage}
            hidden={isQuotedMessage || messageFromSystem}
        >
            <span hidden={messageFromSystem} class="tw-text-white {!isMyMessage ? 'tw-text-white tw-font-bold' : ''}"
                >{isMyMessage ? "You" : sender?.username}</span
            >
            <span class={`tw-text-xxs ${isMyMessage ? "tw-mr-1" : "tw-ml-1"}`}
                >{date?.toLocaleTimeString($locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                })}</span
            >
        </div>
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined && replyDepth === 0}
            <div class="avatar tw-pt-1.5">
                <Avatar avatarUrl={sender?.avatarUrl} fallbackName={sender?.username} />
            </div>
        {/if}

        <div
            class="message
                    {$isDeleted && !isMyMessage && !messageFromSystem && replyDepth === 0 ? 'tw-bg-white/10' : ''}
                    {$isDeleted && isMyMessage && !messageFromSystem && replyDepth === 0 ? 'tw-bg-white/10' : ''}
                    {!isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0 ? 'tw-bg-contrast' : ''}
                    {isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0 ? 'tw-bg-secondary' : ''}
                    {type === 'audio' || type === 'file' ? 'tw-rounded-full' : 'tw-rounded-xl'}
                    {reactions !== undefined && !$isDeleted && replyDepth === 0 ? 'tw-mb-4 tw-p-1' : ''}"
        >
            {#if $isDeleted}
                <p class="tw-py-2 tw-px-2 tw-m-0 tw-text-xs tw-flex tw-items-center tw-italic tw-gap-2 tw-opacity-50">
                    <IconTrash font-size={12} />
                    {$LL.chat.messageDeleted()}
                </p>
            {:else if $selectedChatMessageToEdit !== null && $selectedChatMessageToEdit.id === id}
                <MessageEdition message={$selectedChatMessageToEdit} />
            {:else}
                {#if replyDepth > 0}
                    <div class="tw-px-2 tw-pt-1 tw-text-xxs tw-font-bold">{isMyMessage ? "You" : sender?.username}</div>
                {/if}

                <svelte:component this={messageType[type]} on:updateMessageBody={updateMessageBody} {content} />

                {#if reactions !== undefined}
                    <MessageReactions
                        classes={isMyMessage ? "tw-bg-secondary tw-right-2" : "tw-bg-contrast"}
                        {reactions}
                    />
                {/if}
                {#if $isModified}
                    <div class="tw-text-white/50 tw-text-xxs tw-p-0 tw-m-0 tw-px-2 tw-pb-1 tw-text-right">
                        ({$LL.chat.messageEdited()})
                    </div>
                {/if}
            {/if}

            {#if quotedMessage && replyDepth < 1 && !$isDeleted}
                <div class="tw-p-1 tw-opacity-80">
                    <div class="response tw-bg-white/10 tw-rounded">
                        <svelte:self replyDepth={replyDepth + 1} message={quotedMessage} />
                    </div>
                </div>
            {/if}
        </div>
    </div>

    {#if !isQuotedMessage && !$isDeleted && message.type !== "proximity" && message.type !== "incoming" && message.type !== "outcoming" && ($selectedChatMessageToEdit === null || $selectedChatMessageToEdit.id !== id)}
        <div class="options tw-pt-7 tw-px-1.5 tw-z-50 {!isMyMessage ? 'tw-right-0' : 'tw-left-0'}">
            <MessageOptions {message} />
        </div>
    {/if}
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
    }

    .options {
        display: none;
    }

    .container-grid {
        overflow: auto;
        display: grid;
        grid-gap: 4px;
        grid-template-areas: ". messageHeader" "avatar message" ". response";
    }

    .messageHeader {
        grid-area: messageHeader;
    }

    .message {
        grid-area: message;
        min-width: 180px;
        overflow-wrap: anywhere;
        position: relative;
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
