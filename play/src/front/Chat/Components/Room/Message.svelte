<script lang="ts">

    import { IconCornerDownRight, IconTrash } from "@tabler/icons-svelte";
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


    export let message: ChatMessage;
    export let reactions: MapStore<string, ChatMessageReaction> | undefined;

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
        isModified
    } = message;

    const messageType: { [key in ChatMessageType]: ComponentType } = {
        "image": MessageImage,
        "text": MessageText,
        "file": MessageFile,
        "audio": MessageAudioFile,
        "video": MessageVideoFile
    };

    let messageRef:HTMLDivElement

</script>

<div id="message" bind:this={messageRef} class={`${isMyMessage && "tw-self-end tw-flex-row-reverse"}`}>
    <div class={`container-grid ${isMyMessage ? "tw-justify-end grid-container-inverted" : "tw-justify-start"}`}>
        <div
            class={`messageHeader tw-text-gray-500 tw-text-xxs tw-p-0 tw-m-0 tw-flex tw-justify-between ${isMyMessage ? "tw-flex-row-reverse" : ""} tw-items-end`}
            hidden={isQuotedMessage}>
            <span>{isMyMessage ? "You" : sender?.username}</span>
            <span class={`tw-text-xxxs ${isMyMessage ? "tw-mr-1" : "tw-ml-1" }`}>{date?.toLocaleTimeString($locale, {
                hour: "2-digit",
                minute: "2-digit",
            })}</span>
        </div>
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined}
            <div class="avatar">
                <Avatar avatarUrl={sender?.avatarUrl} fallbackFirstLetter={sender?.username?.charAt(0)} />
            </div>
        {/if}

        <div class="message tw-bg-brand-blue tw-rounded-md tw-p-2">
            {#if $isDeleted}
                <p class="tw-p-0 tw-m-0 tw-text-xs tw-text-gray-500 tw-flex tw-items-center">
                    <IconTrash size={12} /> {$LL.chat.messageDeleted()}</p>
            {:else}
                <svelte:component this={messageType[type]} content={content} />
                {#if $isModified}
                    <p class="tw-text-gray-500 tw-text-xxxs tw-p-0 tw-m-0">(modified)</p>
                {/if}
                {#if $selectedChatMessageToEdit !== null && $selectedChatMessageToEdit.id === id}
                    <MessageEdition message={$selectedChatMessageToEdit} />
                {/if}
                {#if reactions!==undefined}
                    <MessageReactions reactions={reactions}/>
                {/if}
            {/if}
        </div>
        {#if quotedMessage}
            <div class="response">
                <IconCornerDownRight />
                <svelte:self message={quotedMessage} />
            </div>
        {/if}
    </div>
    {#if !isQuotedMessage && !$isDeleted}
        <div
            class={`options tw-bg-white/30 tw-backdrop-blur-sm tw-p-1 tw-rounded-md ${!isMyMessage ? "tw-left-6" : ""}`}>
            <MessageOptions messageRef={messageRef}  message={message} />
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
        position: absolute;
    }

    .container-grid {
        overflow: auto;
        display: grid;
        grid-gap: 4px;
        grid-template-areas: ". messageHeader" "avatar message" ". response";
    }

    .messageHeader {
        grid-area: messageHeader
    }

    .message {
        grid-area: message;
        min-width: 0;
        overflow-wrap: anywhere;
        position: relative;

    }

    .avatar {
        grid-area: avatar
    }

    .response {
        opacity: 50%;
        grid-area: response;
        display: flex;
        flex-direction: row;
    }

</style>
