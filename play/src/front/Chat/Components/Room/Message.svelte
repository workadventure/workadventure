<script lang="ts">
    import { ComponentType } from "svelte";
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
    import { IconCornerDownRight, IconTrash } from "@wa-icons";

    export let message: ChatMessage;
    export let reactions: MapStore<string, ChatMessageReaction> | undefined;
    export let replyDepth = 0;

    const { id, sender, isMyMessage, date, content, quotedMessage, isQuotedMessage, type, isDeleted, isModified } =
        message;

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
    class={`${isMyMessage && "tw-self-end tw-flex-row-reverse tw-relative"} ${
        messageFromSystem && "tw-justify-center"
    } tw-select-text tw-group/message`}
>
    <div
        class="container-grid tw-justify-start tw-pl-4 tw-pr-5 group-hover/message:tw-pb-4 ${isMyMessage
            ? 'tw-justify-end grid-container-inverted'
            : 'tw-justify-start'}"
    >
        <div
            class="messageHeader tw-text-gray-500 tw-text-xxs tw-p-0 tw-m-0 tw-flex tw-justify-between tw-items-end tw-opacity-0 tw-h-0 group-hover/message:tw-pt-2 group-hover/message:tw-h-auto group-hover/message:tw-opacity-100
                    {!isMyMessage && !messageFromSystem && !$isDeleted ? 'tw-mr-14 tw-ml-2' : ''}
                    {isMyMessage && !messageFromSystem && !$isDeleted ? 'tw-ml-14 tw-mr-2' : ''}"
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
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined}
            <div class="avatar tw-pt-1.5">
                <Avatar avatarUrl={sender?.avatarUrl} fallbackName={sender?.username} />
            </div>
        {/if}

        <div
            class="message tw-min-w-36 tw-p-1
                    {$isDeleted && !isMyMessage && !messageFromSystem ? 'tw-bg-white/10 tw-mr-12' : ''}
                    {$isDeleted && isMyMessage && !messageFromSystem ? 'tw-bg-white/10 tw-ml-12' : ''}
                    {!isMyMessage && !messageFromSystem && !$isDeleted ? 'tw-bg-contrast tw-mr-12' : ''}
                    {isMyMessage && !messageFromSystem && !$isDeleted ? 'tw-bg-secondary tw-ml-12' : ''}
                    {type === 'audio' || type === 'file' ? 'tw-rounded-full' : 'tw-rounded-lg'}
                    {reactions !== undefined ? 'tw-mb-4' : ''}"
        >
            {#if $isDeleted}
                <p class="tw-py-1 tw-px-2 tw-m-0 tw-text-xs tw-flex tw-items-center tw-italic tw-gap-2 tw-opacity-50">
                    <IconTrash font-size={12} />
                    {$LL.chat.messageDeleted()}
                </p>
            {:else if $selectedChatMessageToEdit !== null && $selectedChatMessageToEdit.id === id}
                <MessageEdition message={$selectedChatMessageToEdit} />
            {:else}
                <svelte:component this={messageType[type]} {content} />
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

            {#if !isQuotedMessage && !$isDeleted && message.type !== "proximity" && message.type !== "incoming" && message.type !== "outcoming" && ($selectedChatMessageToEdit === null || $selectedChatMessageToEdit.id !== id)}
                <div
                    class="options tw-backdrop-blur-sm tw-pt-1 tw-pb-1.5 tw-px-3 tw-rounded-3xl tw-z-50 -tw-bottom-4 {reactions !==
                    undefined
                        ? ''
                        : ''} {!isMyMessage ? 'tw-mr-2 tw-right-1 tw-bg-contrast' : 'tw-left-2 tw-bg-secondary'}"
                >
                    <MessageOptions {message} />
                </div>
            {/if}
        </div>
        {#if quotedMessage && replyDepth < 2}
            <div class="response">
                <IconCornerDownRight font-size="24" />
                <svelte:self replyDepth={replyDepth + 1} message={quotedMessage} />
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
    }

    .options {
        display: none;
        position: absolute;
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
        min-width: 80px;
        overflow-wrap: anywhere;
        position: relative;
    }

    .avatar {
        grid-area: avatar;
        display: flex;
        /*align-items: flex-end;*/
    }

    .response {
        opacity: 50%;
        grid-area: response;
        display: flex;
        flex-direction: row;
    }
</style>
