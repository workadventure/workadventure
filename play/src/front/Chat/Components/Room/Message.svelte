<script lang="ts">
    import { derived, readable } from "svelte/store";
    import type { Readable } from "svelte/store";
    import { getChatInteraction } from "../../ChatInteractionContext";
    import type {
        ChatMessage,
        ChatMessageType,
        ChatReadReceipts,
        ChatRoomMember,
        ChatThreadSummary,
    } from "../../Connection/ChatConnection";
    import type { WorkAdventureComponent } from "../../../../types/component";
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import AvatarBox from "../../../Components/UI/Avatar.svelte";
    import Avatar from "../Avatar.svelte";

    import { resolveChatUserColor } from "../../Connection/Matrix/services/WaMatrixProfileService";
    import { getMatrixClientForChatTint } from "../../Utils";

    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { isThreadPanelEnabledStore, selectedThreadStore } from "../../Stores/SelectedThreadStore";
    import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
    import MessageOptions from "./MessageOptions.svelte";
    import MessageImage from "./Message/MessageImage.svelte";
    import MessageText from "./Message/MessageText.svelte";
    import MessageFile from "./Message/MessageFile.svelte";
    import MessageAudioFile from "./Message/MessageAudioFile.svelte";
    import MessageVideoFile from "./Message/MessageVideoFile.svelte";
    import MessageAttachmentRecipients from "./Message/MessageAttachmentRecipients.svelte";
    import MessageReadReceipt from "./Message/MessageReadReceipt.svelte";
    import MessageEdition from "./MessageEdition.svelte";
    import MessageReactions from "./MessageReactions.svelte";
    import MessageIncoming from "./Message/MessageIncoming.svelte";
    import MessageOutcoming from "./Message/MessageOutcoming.svelte";
    import Message from "./Message.svelte";
    import ThreadSummary from "./ThreadSummary.svelte";
    import MessageActionSheet from "./MessageActionSheet.svelte";
    import { longPress } from "./longPress";
    import { pickOptionsPlacement } from "./optionsPlacement";
    import type { OptionsPlacement } from "./optionsPlacement";
    import { IconAt, IconTrash } from "@wa-icons";

    const chatInteraction = getChatInteraction();
    const { reply: selectedChatMessageToReply, edit: selectedChatMessageToEdit } = chatInteraction;

    interface Props {
        message: ChatMessage;
        replyDepth?: number;
        showHeader?: boolean;
        /** Matrix rooms: member avatars follow Matrix profile (same pipeline as DM row / room list). */
        membersForMessageAvatars?: Readable<readonly ChatRoomMember[]>;
        /** Root message reply preview; hide inside an open thread timeline (main room only). */
        showThreadSummary?: boolean;
        /** Under my own messages: who has read them. */
        readReceipts?: ChatReadReceipts;
        showReaders?: boolean;
        /** 1:1 conversations: nobody's name is shown, we know who is talking. */
        isDirect?: boolean;
        /** Off for all but the last message of a run from one sender: the time shows on hover instead. */
        showTime?: boolean;
    }

    let {
        message,
        replyDepth = 0,
        showHeader = true,
        membersForMessageAvatars = undefined,
        showThreadSummary = true,
        readReceipts = undefined,
        showReaders = false,
        isDirect = false,
        showTime = true,
    }: Props = $props();

    let messageRef: HTMLDivElement | undefined = $state();

    let {
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
    } = $derived(message);

    let messageFromSystem = $derived(type === "incoming" || type === "outcoming");
    let mentionsMe = $derived(!isMyMessage && $content.mentionsMe === true);
    // A message that mentions us always shows who wrote it, and says so, even in a run of messages from one sender.
    let showSenderHeader = $derived(showHeader || mentionsMe);
    // My own name is never shown, nor the other person's in a 1:1: the time and the receipt live in the bubble.
    let showNameHeader = $derived(
        replyDepth <= 0 && showSenderHeader && !isMyMessage && !isQuotedMessage && !messageFromSystem && !isDirect,
    );

    const messageType: { [key in ChatMessageType]: WorkAdventureComponent } = {
        image: MessageImage,
        text: MessageText,
        file: MessageFile,
        audio: MessageAudioFile,
        video: MessageVideoFile,
        incoming: MessageIncoming,
        outcoming: MessageOutcoming,
        proximity: MessageText,
    };

    let reactionsWithUsers = $derived(
        derived(
            [reactions, ...Array.from(reactions.values()).map((reaction) => reaction.users)],
            ([$reactions, ...$users]) => {
                return Array.from($reactions.values()).filter((reaction) => reaction.users.size > 0);
            },
        ),
    );
    let hasReactions = $derived($reactionsWithUsers.length > 0 && !$isDeleted);
    let hasReadReceipt = $derived(
        readReceipts !== undefined &&
            isMyMessage &&
            replyDepth === 0 &&
            !isQuotedMessage &&
            !$isDeleted &&
            !messageFromSystem,
    );
    // My last message in a group shows the readers' faces under it; until someone reads it, the tick stays in the bubble.
    let hasReaders = $derived(
        hasReadReceipt && showReaders && readReceipts !== undefined && readReceipts.readersOf(id).length > 0,
    );
    let timeLabel = $derived(date?.toLocaleTimeString($locale, { hour: "2-digit", minute: "2-digit" }));
    let isEditing = $derived($selectedChatMessageToEdit !== null && $selectedChatMessageToEdit.id === id);
    let hasStamp = $derived(
        replyDepth === 0 && !isQuotedMessage && !messageFromSystem && (showTime || ($isModified && !$isDeleted)),
    );
    // A text message takes the stamp at the end of its last line, like most messengers; the other kinds (images,
    // files…) and messages ending with a quote get it on a line of its own.
    let stampInText = $derived(
        hasStamp && !$isDeleted && !isEditing && !quotedMessage && (type === "text" || type === "proximity"),
    );
    const emptyThreadSummary = readable<ChatThreadSummary | null>(null);

    let messageSenderAvatarColor = $derived(
        resolveChatUserColor(message.sender?.chatId ?? "", message.sender?.color, getMatrixClientForChatTint()),
    );

    let roomMembersList = $derived(membersForMessageAvatars ? $membersForMessageAvatars : undefined);
    let memberForSender = $derived(
        roomMembersList && message.sender?.chatId
            ? roomMembersList.find((m) => m.id === message.sender!.chatId)
            : undefined,
    );
    let messageAvatarPictureStore = $derived(memberForSender?.pictureStore ?? message.sender?.pictureStore);
    let waParensStore = $derived(memberForSender?.waDisplayNameIfDifferent);
    let waDisplayNameParens = $derived($waParensStore ? $waParensStore : undefined);
    let threadSummary = $derived(message.threadSummary ?? emptyThreadSummary);
    let hasThreadSummary = $derived(
        showThreadSummary && replyDepth === 0 && !isQuotedMessage && !!$threadSummary && $threadSummary.replyCount > 0,
    );

    async function openThread() {
        const thread = await message.openThread?.();
        if (!thread) {
            return;
        }

        selectedChatMessageToReply.set(null);
        if (chatInteraction.openThread) {
            chatInteraction.openThread(thread);
            return;
        }

        if ($isThreadPanelEnabledStore) {
            selectedRoomStore.set(thread.parentRoom);
            roomSidePanelStore.open("threads");
            selectedThreadStore.set(thread);
            return;
        }

        selectedThreadStore.clear();
        selectedRoomStore.set(thread);
    }

    let actionSheetOpen = $state(false);

    // Touch screens have no hover to reveal the options bar: a long press opens the same actions in a sheet,
    // for exactly the messages that have that bar (whatever decides it below).
    function openActionSheet(): boolean {
        if (!messageRef?.querySelector(".options")) {
            return false;
        }
        actionSheetOpen = true;
        return true;
    }

    // Escape leaves the options for the message itself, which hides them; Enter on the message comes back to them.
    function onMessageKeydown(event: KeyboardEvent) {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        if (event.key === "Escape" && event.target.closest(".options")) {
            event.stopPropagation();
            messageRef?.focus();
        } else if (event.key === "Enter" && event.target === messageRef) {
            event.preventDefault();
            messageRef.querySelector<HTMLElement>(".options a, .options button")?.focus();
        }
    }

    let bubbleRef: HTMLDivElement | undefined = $state();
    let optionsPlacement: OptionsPlacement = $state("end");

    // Before the bar shows, pick the corner above the bubble where it hides nothing of the message above.
    function placeOptions() {
        const bar = messageRef?.querySelector<HTMLElement>(".options");
        const item = messageRef?.closest("li");
        if (!messageRef || !bar || !bubbleRef || !item) {
            return;
        }
        const previous = item.previousElementSibling;
        const previousParts = previous
            ? Array.from(previous.querySelectorAll(".message, [data-options-obstacle]"))
            : [];
        const obstacles = [
            // Something without marked parts (a poll, a system line) counts as a whole.
            ...(previous && previousParts.length === 0 ? [previous] : previousParts),
            // Above the bubble in its own item: the unread divider, the sender's name.
            ...Array.from(item.querySelectorAll("[data-options-obstacle]")),
        ].map((element) => element.getBoundingClientRect());
        const { width, height } = bar.getBoundingClientRect();
        optionsPlacement = pickOptionsPlacement(
            bubbleRef.getBoundingClientRect(),
            { width, height },
            obstacles,
            getComputedStyle(messageRef).direction === "rtl",
        );
    }

    // While text of this message is being selected, the bar stays hidden: it would cover what is selected.
    let selecting = $state(false);

    function onMessagePointerDown(event: PointerEvent) {
        if (event.pointerType === "mouse" && !(event.target instanceof Element && event.target.closest(".options"))) {
            selecting = true;
        }
    }

    function onMessagePointerUp() {
        if (!selecting) {
            return;
        }
        const selection = window.getSelection();
        selecting = !!selection && !selection.isCollapsed && !!messageRef?.contains(selection.anchorNode);
    }
</script>

{#snippet stamp()}
    <span class="float-right ms-2 mt-1 inline-flex items-center gap-1 text-xxs leading-4 text-white/60">
        {#if $isModified && !$isDeleted}
            <span>({$LL.chat.messageEdited()})</span>
        {/if}
        {#if showTime}
            <span class="font-condensed text-nowrap">{timeLabel}</span>
        {/if}
        {#if showTime && hasReadReceipt && !hasReaders && readReceipts !== undefined}
            <MessageReadReceipt messageId={id} receipts={readReceipts} showReaders={false} members={roomMembersList} />
        {/if}
    </span>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    id="message"
    tabindex="-1"
    class={`${isMyMessage && "self-end flex-row-reverse relative"} ${
        messageFromSystem && "justify-center"
    } select-text block-user-action messageContainer items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70`}
    class:selecting
    bind:this={messageRef}
    use:longPress={openActionSheet}
    onkeydown={onMessageKeydown}
    onpointerenter={placeOptions}
    onfocusin={placeOptions}
    onpointerdown={onMessagePointerDown}
    onpointerup={onMessagePointerUp}
    onpointerleave={() => (selecting = false)}
>
    <div
        style={replyDepth === 0 ? "max-width: calc( 100% - 50px );" : "padding-left: 0"}
        class="flex gap-2 overflow-visible relative {replyDepth === 0 ? 'max-w-[calc(100% - 100px)]' : ''} {!$isDeleted
            ? 'group-hover/message:pb-4'
            : ''} {isMyMessage ? 'justify-end grid-container-inverted pr-4' : 'justify-start pl-3'}"
    >
        {#if (!isMyMessage || isQuotedMessage) && sender !== undefined && replyDepth === 0 && showSenderHeader && !isDirect}
            <AvatarBox class="overflow-hidden {showNameHeader ? 'mt-4' : ''} shrink-0">
                <Avatar
                    compact
                    pictureStore={messageAvatarPictureStore}
                    fallbackName={sender?.username}
                    color={messageSenderAvatarColor}
                />
            </AvatarBox>
        {/if}

        <!-- Without a header, the avatar is left out: keep its column so the bubble lines up with the one above.
             Our own messages never show an avatar, so they have no column to keep. -->
        <div
            class="flex flex-col justify-end {replyDepth === 0
                ? 'max-w-[min(100%,65ch)]'
                : 'max-w-full'} {replyDepth === 0 && !showSenderHeader && (!isMyMessage || isQuotedMessage) && !isDirect
                ? 'ml-12'
                : ''}"
        >
            {#if showNameHeader}
                <div class="w-full h-fit text-xs px-2 flex items-end gap-2 overflow-x-hidden" data-options-obstacle>
                    <span class="text-nowrap text-sm font-bold text-white"
                        >{sender?.username}{#if waDisplayNameParens}<span class="text-xs font-normal opacity-75 ml-0.5"
                                >({waDisplayNameParens})</span
                            >{/if}</span
                    >
                    {#if mentionsMe}
                        <span
                            class="flex items-center gap-1 text-nowrap text-xs font-medium text-danger-500"
                            data-testid="messageMentionsMe"
                        >
                            <IconAt font-size={14} />
                            {$LL.chat.mention.mentionedYou()}
                        </span>
                    {/if}
                </div>
            {/if}
            <div
                bind:this={bubbleRef}
                title={showTime || replyDepth > 0 ? undefined : timeLabel}
                class="message rounded-md
                    {$isDeleted && !isMyMessage && !messageFromSystem && replyDepth === 0 ? 'bg-white/10' : ''}
                    {$isDeleted && isMyMessage && !messageFromSystem && replyDepth === 0 ? 'bg-white/10' : ''}
                    {!isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0
                    ? 'bg-contrast/90 rounded-bl-none'
                    : ''}
                    {isMyMessage && !messageFromSystem && !$isDeleted && replyDepth === 0
                    ? 'bg-secondary/90 rounded-br-none'
                    : ''}
                    {!isQuotedMessage ? 'my' : ''}
                    {hasReactions ? 'pb-2' : ''}"
            >
                {#if $isDeleted}
                    <p class="py-2 px-2 m-0 text-xs flex items-center italic gap-2 opacity-50">
                        <IconTrash font-size={12} />
                        {isMyMessage ? $LL.chat.messageDeletedByYou() : $LL.chat.messageDeleted()}
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

                    {@const MessageComponent = messageType[type]}
                    <MessageComponent {content} {message} trailing={stampInText ? stamp : undefined} />
                    {#if message.attachment?.delivery}
                        <MessageAttachmentRecipients recipients={message.attachment.delivery} />
                    {/if}

                    {#if $isModified && replyDepth > 0}
                        <div class="text-white/50 text-xxs p-0 m-0 px-2 pb-1 text-right">
                            ({$LL.chat.messageEdited()})
                        </div>
                    {/if}
                {/if}

                {#if quotedMessage && replyDepth < 1 && !$isDeleted}
                    <div class="p-1 opacity-80">
                        <div class="response bg-white/10 rounded">
                            <Message replyDepth={replyDepth + 1} message={quotedMessage} {membersForMessageAvatars} />
                        </div>
                    </div>
                {/if}

                {#if hasStamp && !stampInText}
                    <div class="flex justify-end px-2 pb-1 -mt-1">{@render stamp()}</div>
                {/if}
                {#if !isQuotedMessage && !$isDeleted && message.type !== "incoming" && message.type !== "outcoming" && ($selectedChatMessageToEdit === null || $selectedChatMessageToEdit.id !== id)}
                    <!-- Above the bubble, never on it: on it, the bar hid the text being read or copied. The bottom
                         padding bridges the gap to the bubble, so the pointer does not lose the hover on its way up. -->
                    <div
                        class="options absolute bottom-full z-50 pb-1 {optionsPlacement === 'start'
                            ? 'start-0'
                            : 'end-0'}"
                    >
                        <div
                            class="rounded-lg p-0.5 bg-contrast border border-solid border-white/15 shadow-lg ring-2 ring-contrast"
                        >
                            <MessageOptions {message} {messageRef} onOpenThread={openThread} />
                        </div>
                    </div>
                {/if}
            </div>
            {#if hasReactions || hasReaders}
                <!-- The reactions straddle the bubble's bottom edge from its left; in a group, who has read my last
                     message sits at the other end of the same line. -->
                <div
                    class="relative z-10 flex items-start gap-1 px-1.5 {hasReactions ? '-mt-2.5' : ''}"
                    data-options-obstacle
                >
                    {#if hasReactions}
                        <MessageReactions
                            classes="min-w-0 mt-0! *:bg-contrast-900 *:ring-2 *:ring-contrast"
                            reactions={$reactionsWithUsers}
                        />
                    {/if}
                    {#if hasReaders && readReceipts !== undefined}
                        <div class="ms-auto {hasReactions ? 'mt-2.5' : ''}">
                            <MessageReadReceipt
                                messageId={id}
                                receipts={readReceipts}
                                showReaders
                                showSeenByLabel={!hasReactions}
                                members={roomMembersList}
                            />
                        </div>
                    {/if}
                </div>
            {/if}

            {#if hasThreadSummary && $threadSummary}
                <ThreadSummary summary={$threadSummary} {openThread} />
            {/if}
        </div>
    </div>
    {#if actionSheetOpen}
        <MessageActionSheet {message} onOpenThread={openThread} onClose={() => (actionSheetOpen = false)} />
    {/if}
</div>

<style>
    #message {
        display: flex;
        align-items: flex-start;
        position: relative;
    }

    #message:hover .options,
    #message:focus-within:not(:focus) .options {
        display: flex;
        flex-direction: row;
        gap: 2px;
        transition-delay: 0.15s;
        opacity: 1;
        pointer-events: auto;
    }

    /* Hidden, it must not catch the pointer: it sits over the message above. Keyboard focus still reaches it. */
    .options {
        transition: all 0.2s ease-in-out;
        opacity: 0;
        pointer-events: none;
    }

    #message.selecting .options {
        opacity: 0;
        pointer-events: none;
    }

    /* A long press opens the action sheet, which can copy the text: native selection would fight it. */
    @media (pointer: coarse) {
        #message {
            -webkit-user-select: none;
            user-select: none;
        }
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
