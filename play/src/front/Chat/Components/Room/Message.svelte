<script lang="ts">
    import type { ComponentType } from "svelte";
    import { createEventDispatcher } from "svelte";
    import { derived } from "svelte/store";
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageType, ChatRoomMember } from "../../Connection/ChatConnection";
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import Avatar from "../Avatar.svelte";
    import { defaultColor } from "../../Connection/Matrix/MatrixChatConnection";
    import { resolveChatUserColorWithCache } from "../../Connection/Matrix/directMessageAvatar";
    import { matrixWaDisplayNameForColorStore } from "../../Stores/matrixWaDisplayNameForColorStore";
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
    export let showHeader = true;
    /** Matrix rooms: member avatars follow Matrix profile (same pipeline as DM row / room list). */
    export let membersForMessageAvatars: Readable<readonly ChatRoomMember[]> | undefined = undefined;

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

    $: messageSenderAvatarColor = ((_matrixWaDep) => {
        return message.sender?.chatId !== undefined && message.sender.chatId !== ""
            ? resolveChatUserColorWithCache(message.sender.chatId, message.sender.color) ?? defaultColor
            : null;
    })($matrixWaDisplayNameForColorStore);

    $: roomMembersList = membersForMessageAvatars ? $membersForMessageAvatars : undefined;
    $: memberForSender =
        roomMembersList && message.sender?.chatId
            ? roomMembersList.find((m) => m.id === message.sender!.chatId)
            : undefined;
    $: messageAvatarPictureStore = memberForSender?.pictureStore ?? message.sender?.pictureStore;
    $: waParensStore = memberForSender?.waDisplayNameIfDifferent;
    $: waDisplayNameParens = waParensStore ? $waParensStore : undefined;
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
        class="flex gap-2 justify-start overflow-visible relative {replyDepth === 0
            ? 'max-w-[calc(100% - 100px)]'
            : ''} {!$isDeleted ? 'group-hover/message:pb-4' : ''} {isMyMessage
            ? 'justify-end grid-container-inverted pr-4'
            : 'justify-start pl-3'}"
    >
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined && replyDepth === 0 && showHeader}
            <div class="avatar overflow-hidden mt-4 shrink-0">
                <Avatar
                    compact
                    pictureStore={messageAvatarPictureStore}
                    fallbackName={sender?.username}
                    color={messageSenderAvatarColor}
                />
            </div>
        {/if}

        <div class="flex flex-col justify-end {replyDepth === 0 && !showHeader ? 'ml-9' : ''}">
            {#if replyDepth <= 0 && showHeader}
                <div
                    class="w-full h-fit text-xs px-2 flex justify-between items-end gap-2 overflow-x-hidden"
                    class:flex-row-reverse={isMyMessage}
                    hidden={isQuotedMessage || messageFromSystem}
                >
                    <span
                        hidden={messageFromSystem}
                        class="text-nowrap text-sm font-bold {!isMyMessage ? 'text-white' : 'text-white/75'}"
                        >{isMyMessage ? $LL.chat.you() : sender?.username}{#if waDisplayNameParens}<span
                                class="text-xs font-normal opacity-75 ml-0.5">({waDisplayNameParens})</span
                            >{/if}</span
                    >
                    <span class={`text-xs font-condensed text-nowrap opacity-75 ${isMyMessage ? "mr-1" : "ml-1"}`}
                        >{date?.toLocaleTimeString($locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}</span
                    >
                </div>
            {/if}
            <div
                class="message rounded-md
                    {$isDeleted && !isMyMessage && !messageFromSystem && replyDepth === 0 ? 'bg-white/10' : ''}
                    {$isDeleted && isMyMessage && !messageFromSystem && replyDepth === 0 ? 'bg-white/10' : ''}
                    {!isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0
                    ? 'bg-contrast/90 rounded-bl-none'
                    : ''}
                    {isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0
                    ? 'bg-secondary/90 rounded-br-none'
                    : ''}
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
                        <div class="px-2 pt-1 text-xxs font-bold">
                            {isMyMessage ? $LL.chat.you() : sender?.username}{#if waDisplayNameParens}<span
                                    class="text-xxs font-normal opacity-75 ml-0.5">({waDisplayNameParens})</span
                                >{/if}
                        </div>
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
                            <svelte:self
                                replyDepth={replyDepth + 1}
                                message={quotedMessage}
                                {membersForMessageAvatars}
                            />
                        </div>
                    </div>
                {/if}
            </div>
            {#if !isQuotedMessage && !$isDeleted && message.type !== "proximity" && message.type !== "incoming" && message.type !== "outcoming" && ($selectedChatMessageToEdit === null || $selectedChatMessageToEdit.id !== id)}
                <div
                    class="options -top-2 absolute z-50 rounded p-1 {!isMyMessage
                        ? 'right-2 bg-contrast/80'
                        : 'right-6 bg-secondary/80'}"
                >
                    <MessageOptions {message} {messageRef} />
                </div>
            {/if}
        </div>
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
        transition-delay: 0.15s;
        opacity: 1;
    }

    .options {
        transition: all 0.2s ease-in-out;
        opacity: 0;
    }

    .message {
        min-width: 180px;
        overflow-wrap: anywhere;
        position: relative;
        transition: all 0.2s ease-in-out 0s;
    }

    .message.my:hover {
        transition-delay: 0.5s;
    }
    .avatar {
        display: flex;
        background: none;
    }
</style>
