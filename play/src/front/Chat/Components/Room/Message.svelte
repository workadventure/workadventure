<script lang="ts">
    import { ComponentType } from "svelte";
    import { MapStore } from "@workadventure/store-utils";
    import { ChatMessage, ChatMessageReaction, ChatMessageType } from "../../Connection/ChatConnection";
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import Avatar from "../Avatar.svelte";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import { IconCornerDownRight, IconTrash } from "@wa-icons";
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

    const { id, sender, isMyMessage, date, content, quotedMessage, isQuotedMessage, type, isDeleted, isModified } =
        message;

    const messageType: { [key in ChatMessageType]: ComponentType } = {
        image: MessageImage as ComponentType,
        text: MessageText as ComponentType,
        file: MessageFile as ComponentType,
        audio: MessageAudioFile as ComponentType,
        video: MessageVideoFile as ComponentType,
    };

    let messageRef: HTMLDivElement;
</script>

<div id="message" bind:this={messageRef} class={`${isMyMessage && "tw-self-end tw-flex-row-reverse"}`}>
    <div class={`container-grid ${isMyMessage ? "tw-justify-end grid-container-inverted" : "tw-justify-start"}`}>
        <div
            class="messageHeader tw-text-gray-500 tw-text-xxs tw-p-0 tw-m-0 tw-flex tw-justify-between tw-items-end"
            class:tw-flex-row-reverse={isMyMessage}
            hidden={isQuotedMessage}
        >
            <span>{isMyMessage ? "You" : sender?.username}</span>
            <span class={`tw-text-xxxs ${isMyMessage ? "tw-mr-1" : "tw-ml-1"}`}
                >{date?.toLocaleTimeString($locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                })}</span
            >
        </div>
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined}
            <div class="avatar">
                <Avatar avatarUrl={sender?.avatarUrl} fallbackFirstLetter={sender?.username?.charAt(0)} />
            </div>
        {/if}

        <div
            class="message tw-rounded-2xl tw-p-2"
            class:tw-bg-primary={!isMyMessage}
            class:tw-bg-secondary={isMyMessage}
            class:tw-rounded-br-none={isMyMessage}
            class:tw-rounded-bl-none={!isMyMessage}
        >
            {#if $isDeleted}
                <p class="tw-p-0 tw-m-0 tw-text-xs tw-text-gray-400 tw-flex tw-items-center">
                    <IconTrash font-size={12} />
                    {$LL.chat.messageDeleted()}
                </p>
            {:else}
                <svelte:component this={messageType[type]} {content} />
                {#if $isModified}
                    <p class="tw-text-gray-300 tw-text-xxxs tw-p-0 tw-m-0">({$LL.chat.messageEdited()})</p>
                {/if}
                {#if $selectedChatMessageToEdit !== null && $selectedChatMessageToEdit.id === id}
                    <MessageEdition message={$selectedChatMessageToEdit} />
                {/if}
                {#if reactions !== undefined}
                    <MessageReactions {reactions} />
                {/if}
            {/if}
        </div>
        {#if quotedMessage}
            <div class="response">
                <IconCornerDownRight font-size="24" />
                <svelte:self message={quotedMessage} />
            </div>
        {/if}
    </div>
    {#if !isQuotedMessage && !$isDeleted}
        <div
            class={`options tw-bg-white/30 tw-backdrop-blur-sm tw-p-1 tw-rounded-md ${!isMyMessage ? "tw-left-6" : ""}`}
        >
            <MessageOptions {messageRef} {message} />
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
        grid-area: messageHeader;
    }

    .message {
        grid-area: message;
        min-width: 0;
        overflow-wrap: anywhere;
        position: relative;
    }

    .avatar {
        grid-area: avatar;
        display: flex;
        align-items: flex-end;
    }

    .response {
        opacity: 50%;
        grid-area: response;
        display: flex;
        flex-direction: row;
    }
</style>
