<script lang="ts">
    import { onDestroy, onMount, tick, untrack } from "svelte";
    import { get, readable } from "svelte/store";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import {
        hasProximityChatSidePanel,
        type ChatConversation,
        type ChatMessage,
        type ChatRoom,
        type ChatThreadSummary,
        type ChatTimelineItem,
    } from "../../Connection/ChatConnection";
    import getCloseImg from "../../images/get-close.png";
    import { selectedChatMessageToReply, shouldRestoreChatStateStore } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { hideActionBarStoreBecauseOfChatBar } from "../../ChatSidebarWidthStore";
    import {
        roomSidePanelStore,
        roomTimelineFocusStore,
        type RoomTimelineFocusRequest,
    } from "../../Stores/RoomSidePanelStore";
    import { matrixSecurity } from "../../Connection/Matrix/MatrixSecurity";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import LL from "../../../../i18n/i18n-svelte";
    import Message from "./Message.svelte";
    import MessageInputBar from "./MessageInputBar.svelte";
    import MessageSystem from "./MessageSystem.svelte";
    import PollCard from "./PollCard.svelte";
    import TypingUsers from "./TypingUsers.svelte";
    import { shouldReserveFloatingCloseButtonSpace } from "./RoomTimelineHeaderLayout";
    import { IconChevronLeft, IconChevronRight, IconLoader, IconMailBox, IconInfoCircle } from "@wa-icons";

    interface Props {
        room: ChatConversation;
        backAction?: () => void;
        backButtonTestId?: string;
        timelineTestId?: string;
        showRoomSidePanelToggle?: boolean;
    }

    let {
        room,
        backAction = undefined,
        backButtonTestId = "chatBackward",
        timelineTestId = "roomTimeline",
        showRoomSidePanelToggle = false,
    }: Props = $props();

    const chatConnection = gameManager.chatConnection;
    const shouldRetrySendingEvents = chatConnection.shouldRetrySendingEvents;
    let myChatID = localUserStore.getChatId();

    // Time gap threshold for message grouping (5 minutes)
    const TIME_GAP_THRESHOLD = 5 * 60 * 1000;

    const AUTO_SCROLL_THRESHOLD_PX = 20;
    /** No scroll event for this long means our own smooth animation has landed. */
    const PROGRAMMATIC_SCROLL_SETTLE_MS = 150;
    /** Release the anchor once the content has stopped resizing for this long. */
    const ANCHOR_IDLE_RELEASE_MS = 400;
    /** Absolute cap, so a pathological stream of resizes cannot hold the anchor forever. */
    const ANCHOR_MAX_HOLD_MS = 3000;
    /** Paginate while the topmost visible message is within this many items of the start. */
    const PAGINATION_TRIGGER_ITEM_INDEX = 10;

    type ProgrammaticScrollKind = "pin-bottom" | "resync";
    type ScrollAnchor = { element: HTMLLIElement; offset: number };

    let messageListRef: HTMLDivElement | undefined = $state();
    /** Sticky-bottom intent. Only real user scrolls and explicit pin/unpin calls write this. */
    let autoScroll = $state(true);
    let loadingMessagePromise: Promise<void> | undefined = $state();
    let shouldDisplayLoader = $state(false);
    let messageInputBarRef: MessageInputBar | undefined = $state();
    let lastTimelineFocusSequence = $state(0);
    let initialMessagesLoaded = $state(false);

    // Imperative, deliberately not $state: read and written from DOM handlers, never from the template.
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let programmaticScrollKind: ProgrammaticScrollKind | undefined;
    let programmaticScrollSettleTimer: ReturnType<typeof setTimeout> | undefined;
    let scrollAnchor: ScrollAnchor | undefined;
    let anchorIdleReleaseTimer: ReturnType<typeof setTimeout> | undefined;
    let anchorHardReleaseTimer: ReturnType<typeof setTimeout> | undefined;
    let lastSeenLastItemKey: string | undefined;
    let contentResizeObserver: ResizeObserver | undefined;
    const observedItems = new WeakSet<Element>();

    const gameScene = gameManager.getCurrentGameScene();
    const chatRoomsEnableInAdmin = gameScene.room.isChatEnabled;
    const direction = document.documentElement.getAttribute("dir") || "ltr";

    function isChatRoom(conversation: ChatConversation): conversation is ChatRoom {
        return conversation.conversationKind === "room";
    }

    const emptyThreadSummaries = readable<readonly ChatThreadSummary[]>([]);
    const emptyUnreadQuestionCount = readable(0);

    let roomSidePanelToggleIsOpen = $derived($roomSidePanelStore.isOpen ?? false);
    let roomName = $derived(room?.name);
    let typingMembers = $derived(room.typingMembers);
    let timelineItems = $derived(room.timelineItems);
    let initializationState = $derived(room.initializationState);
    let initializationError = $derived(room.initializationError);
    // threads exist only on ChatRoom, not when this timeline shows a thread (ThreadPanel).
    let threadsStore = $derived(isChatRoom(room) ? room.threads : undefined);
    let threadSummariesStore = $derived(threadsStore ?? emptyThreadSummaries);
    let unreadThreadCount = $derived($threadSummariesStore.filter((thread) => thread.hasUnreadMessages).length);
    let proximitySidePanelRoom = $derived(hasProximityChatSidePanel(room) ? room : undefined);
    let unreadQuestionCountStore = $derived(proximitySidePanelRoom?.unreadQuestionCount ?? emptyUnreadQuestionCount);
    let unreadSidePanelCount = $derived(unreadThreadCount + $unreadQuestionCountStore);
    let shouldReserveHeaderEndSpace = $derived(
        shouldReserveFloatingCloseButtonSpace(
            $hideActionBarStoreBecauseOfChatBar,
            showRoomSidePanelToggle,
            roomSidePanelToggleIsOpen,
        ),
    );
    $effect(() => {
        if (initialMessagesLoaded && $roomTimelineFocusStore) {
            focusTimelineEvent($roomTimelineFocusStore).catch((error) => console.error(error));
        }
    });

    type RenderItem =
        | { kind: "separator"; key: string; label: string }
        | { kind: "item"; key: string; timelineItem: ChatTimelineItem; showHeader: boolean };

    function isValidDate(d: Date) {
        return d instanceof Date && !Number.isNaN(d.getTime());
    }

    function getTimelineItemDate(timelineItem: ChatTimelineItem): Date | undefined {
        if (timelineItem?.date && isValidDate(timelineItem.date)) {
            return timelineItem.date;
        }
        return undefined;
    }

    function isSameLocalDay(a: Date, b: Date): boolean {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function dayLabel(d: Date): string {
        const today = new Date();
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const labels = get(LL);
        if (isSameLocalDay(d, today)) return labels.chat.timeLine.today();
        if (isSameLocalDay(d, yesterday)) return labels.chat.timeLine.yesterday();

        return new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
        }).format(d);
    }

    function dayKey(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    }

    let renderItems = $derived.by(() => {
        const out: RenderItem[] = [];
        let lastDayKey: string | null = null;
        let previousMessage: ChatMessage | undefined = undefined;
        const currentTimelineItems = $timelineItems ?? [];

        for (const timelineItem of currentTimelineItems) {
            const d = getTimelineItemDate(timelineItem);
            let insertedSeparator = false;

            if (d && isValidDate(d)) {
                const k = dayKey(d);
                if (k !== lastDayKey) {
                    out.push({
                        kind: "separator",
                        key: `sep-${k}`,
                        label: dayLabel(d),
                    });
                    lastDayKey = k;
                    insertedSeparator = true;
                }
            }

            if (insertedSeparator) {
                previousMessage = undefined;
            }

            const currentMessage = timelineItem.kind === "message" ? timelineItem.message : undefined;
            const previousMessageUserId = previousMessage?.sender?.spaceUserId ?? previousMessage?.sender?.chatId;
            const currentMessageUserId = currentMessage?.sender?.spaceUserId ?? currentMessage?.sender?.chatId;
            const timeDiff =
                currentMessage?.date && previousMessage?.date
                    ? currentMessage.date.getTime() - previousMessage.date.getTime()
                    : Infinity;
            const isRepeatedSender =
                !!currentMessage &&
                !!previousMessageUserId &&
                previousMessageUserId === currentMessageUserId &&
                timeDiff < TIME_GAP_THRESHOLD;

            out.push({
                kind: "item",
                key: `${timelineItem.kind}-${timelineItem.id}`,
                timelineItem,
                showHeader: !isRepeatedSender,
            });
            previousMessage = currentMessage;
        }

        return out;
    });

    const MAX_INITIAL_FILL_ROUNDS = 5;

    onMount(() => {
        // Catches every height change: async markdown, lazy-loaded highlight.js, images, edits.
        // Runs after layout and before paint, so repositioning here is invisible.
        contentResizeObserver = new ResizeObserver(() => {
            if (!initialMessagesLoaded) return;
            if (scrollAnchor !== undefined) {
                restoreScrollAnchor();
                return;
            }
            if (autoScroll) scrollToMessageListBottom();
        });
        syncContentResizeObservations();

        initMessages()
            .catch((error) => console.error(error))
            .finally(() => focusPendingTimelineRequestOrScrollToBottom().catch((error) => console.error(error)));

        return () => contentResizeObserver?.disconnect();
    });

    /**
     * Observes each <li>, not the <ul>: the list is capped by `max-h-full`, so its own box never
     * grows with the content and a ResizeObserver on it would never fire. Items are observed once
     * each — the initial callback on a newly observed item is what repositions after a prepend.
     */
    function syncContentResizeObservations() {
        if (!contentResizeObserver || !messageListRef) return;
        for (const item of messageListRef.querySelectorAll<HTMLLIElement>("li[data-event-id]")) {
            if (observedItems.has(item)) continue;
            observedItems.add(item);
            contentResizeObserver.observe(item);
        }
    }

    onDestroy(() => {
        clearTimeout(scrollTimer);
        clearTimeout(programmaticScrollSettleTimer);
        clearTimeout(anchorIdleReleaseTimer);
        clearTimeout(anchorHardReleaseTimer);
    });

    /** Fills the viewport on open, one page at a time. Rounds are inherently sequential. */
    async function fillViewport(remainingRounds: number) {
        await room.loadMorePreviousMessages();
        // isViewportNotFilled() reads the DOM: without this it measures the pre-insert list.
        await tick();

        if (remainingRounds > 1 && get(room.hasPreviousMessage) && isViewportNotFilled()) {
            await fillViewport(remainingRounds - 1);
        }
    }

    async function initMessages() {
        if (!messageListRef) return;
        initialMessagesLoaded = false;

        try {
            await room.ensureTimelineInitialized();
            if (get(room.isEncrypted) && get(matrixSecurity.isEncryptionRequiredAndNotSet)) {
                return;
            }

            await fillViewport(MAX_INITIAL_FILL_ROUNDS);
        } catch (error) {
            console.error(`Failed to load messages: ${error}`);
        } finally {
            // Must be set even on failure, otherwise the $roomTimelineFocusStore effect stays frozen.
            initialMessagesLoaded = true;
        }
    }

    function retryInitialization() {
        room.ensureTimelineInitialized().catch((error) => console.error(error));
    }

    function hasPendingTimelineFocusRequest(
        request: RoomTimelineFocusRequest | undefined,
    ): request is RoomTimelineFocusRequest {
        return request !== undefined && request.roomId === room.id && request.sequence > lastTimelineFocusSequence;
    }

    async function focusPendingTimelineRequestOrScrollToBottom() {
        const pendingFocusRequest = get(roomTimelineFocusStore);

        if (hasPendingTimelineFocusRequest(pendingFocusRequest)) {
            await focusTimelineEvent(pendingFocusRequest);
            return;
        }

        // Instant: a smooth scroll from top to bottom on a fresh room looks wrong, and it opens a
        // ~300ms window where handleScroll's debounce can paginate from scrollTop = 0.
        scrollToMessageListBottom("auto");
    }

    $effect(() => {
        if ($initializationState === "ready") {
            room.setTimelineAsRead();
        }
    });

    $effect(() => {
        const items = renderItems;
        const lastKey = items[items.length - 1]?.key;

        // Newly rendered messages must be observed before they finish resizing.
        syncContentResizeObservations();

        if (!initialMessagesLoaded) {
            // Seed the baseline; onMount owns the initial scroll (bottom, or a pending focus request).
            lastSeenLastItemKey = lastKey;
            return;
        }

        // False by construction during back-pagination: prepending does not change the last item.
        const isNewLastItem = lastKey !== undefined && lastKey !== lastSeenLastItemKey;
        lastSeenLastItemKey = lastKey;

        const lastItem = items[items.length - 1];
        const lastMessage =
            lastItem?.kind === "item" && lastItem.timelineItem.kind === "message"
                ? lastItem.timelineItem.message
                : undefined;

        if (isNewLastItem && lastMessage?.sender?.chatId === myChatID) {
            // I just sent this: jump to it even if I was reading history.
            scrollToMessageListBottom();
            return;
        }
        // Older messages were prepended: hold position, never fall through to a bottom scroll.
        if (scrollAnchor !== undefined) {
            restoreScrollAnchor();
            return;
        }
        // untrack: scrollToMessageListBottom writes autoScroll, reading it reactively would re-enter.
        if (isNewLastItem && untrack(() => autoScroll)) {
            scrollToMessageListBottom();
        }
    });

    function isAtBottom(): boolean {
        if (!messageListRef) return true;
        const distanceToBottom = messageListRef.scrollHeight - messageListRef.scrollTop - messageListRef.clientHeight;
        return distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX;
    }

    /**
     * Programmatic scrolls emit `scroll` events just like user ones. Without this guard they would
     * clobber `autoScroll` mid-animation and trigger spurious backward pagination.
     */
    function beginProgrammaticScroll(kind: ProgrammaticScrollKind) {
        programmaticScrollKind = kind;
        armProgrammaticScrollSettle();
    }

    function armProgrammaticScrollSettle() {
        clearTimeout(programmaticScrollSettleTimer);
        programmaticScrollSettleTimer = setTimeout(() => {
            const kind = programmaticScrollKind;
            programmaticScrollKind = undefined;
            // "pin-bottom" deliberately does not resync: a smooth scroll freezes its target at call
            // time, so async markdown growing the list makes it land on the old bottom. Resyncing
            // would then read "not at bottom" and kill every later pin.
            if (kind === "resync") {
                autoScroll = isAtBottom();
            }
        }, PROGRAMMATIC_SCROLL_SETTLE_MS);
    }

    /** An explicit user gesture always wins over an in-flight programmatic animation. */
    function cancelProgrammaticScroll() {
        if (programmaticScrollKind === undefined) return;
        clearTimeout(programmaticScrollSettleTimer);
        programmaticScrollKind = undefined;
        autoScroll = isAtBottom();
    }

    function captureScrollAnchor() {
        if (!messageListRef) return;
        const containerTop = messageListRef.getBoundingClientRect().top;
        // Only real messages: day separators and loader/empty-state <li>s have no stable id and can
        // be inserted or removed by the prepend itself.
        const items = messageListRef.querySelectorAll<HTMLLIElement>("li[data-event-id]");
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (rect.bottom > containerTop) {
                scrollAnchor = { element: item, offset: rect.top - containerTop };
                return;
            }
        }
        scrollAnchor = undefined;
    }

    function restoreScrollAnchor() {
        const anchor = scrollAnchor;
        if (!messageListRef || !anchor) return;
        if (!anchor.element.isConnected || !messageListRef.contains(anchor.element)) {
            // Anchor was unmounted (redaction, timeline rebuild). Releasing is the only safe move:
            // any fallback would be a guess, and a wrong guess is exactly the jump we are fixing.
            releaseScrollAnchor();
            return;
        }
        const containerTop = messageListRef.getBoundingClientRect().top;
        const delta = anchor.element.getBoundingClientRect().top - containerTop - anchor.offset;
        // Sub-pixel deltas are noise; writing scrollTop would emit a pointless scroll event.
        if (Math.abs(delta) < 1) return;
        beginProgrammaticScroll("resync");
        messageListRef.scrollTop += delta;
        armAnchorIdleRelease();
    }

    function releaseScrollAnchor() {
        scrollAnchor = undefined;
        clearTimeout(anchorIdleReleaseTimer);
        clearTimeout(anchorHardReleaseTimer);
    }

    function armAnchorIdleRelease() {
        clearTimeout(anchorIdleReleaseTimer);
        anchorIdleReleaseTimer = setTimeout(releaseScrollAnchor, ANCHOR_IDLE_RELEASE_MS);
    }

    function armAnchorHardRelease() {
        clearTimeout(anchorHardReleaseTimer);
        anchorHardReleaseTimer = setTimeout(releaseScrollAnchor, ANCHOR_MAX_HOLD_MS);
    }

    function scrollToMessageListBottom(behavior: ScrollBehavior = "smooth") {
        if (messageListRef == undefined) return;
        releaseScrollAnchor();
        autoScroll = true;
        beginProgrammaticScroll("pin-bottom");
        messageListRef.scroll({ top: messageListRef.scrollHeight, behavior });
    }

    function goBackAndClearSelectedChatMessage() {
        selectedChatMessageToReply.set(null);
        if (backAction) {
            backAction();
            shouldRestoreChatStateStore.set(false);
            return;
        }
        if (room.conversationKind === "thread" && room.parentRoom) {
            selectedRoomStore.set(room.parentRoom);
        } else {
            selectedRoomStore.set(undefined);
        }
        shouldRestoreChatStateStore.set(false);

        if (room instanceof ProximityChatRoom) {
            room.intentionallyClosed.set(true);
        }
    }

    function handleScroll() {
        if (programmaticScrollKind !== undefined) {
            // Keep extending the settle window while our own animation is still emitting events.
            armProgrammaticScrollSettle();
            return;
        }
        autoScroll = isAtBottom();
        // The user is driving: keep the anchor on where they are now, not where they were.
        if (scrollAnchor !== undefined) captureScrollAnchor();

        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(loadMorePreviousMessages, 100);
    }

    function loadMorePreviousMessages() {
        if (loadingMessagePromise || !shouldLoadMoreMessages()) return;

        // Synchronous, before any await: the DOM here is exactly what the user is looking at.
        captureScrollAnchor();
        armAnchorHardRelease();

        if (messageListRef?.scrollTop === 0) {
            shouldDisplayLoader = true;
        }

        const pending = room
            .loadMorePreviousMessages()
            .then(() => tick())
            .then(() => restoreScrollAnchor());

        loadingMessagePromise = pending;
        pending
            .catch((error) => console.error(`Failed to load messages: ${error}`))
            .finally(() => {
                // The identity check keeps a stale round from clearing a newer one.
                if (loadingMessagePromise === pending) loadingMessagePromise = undefined;
                shouldDisplayLoader = false;
                armAnchorIdleRelease();
            });
    }

    function shouldLoadMoreMessages(): boolean {
        if (!messageListRef || !get(room.hasPreviousMessage)) return false;
        // Compare against the container, not the viewport: the chat header pushes messageListRef
        // below y=0, so `top >= 0` matches items already scrolled out the top.
        const containerTop = messageListRef.getBoundingClientRect().top;
        const items = Array.from(messageListRef.querySelectorAll<HTMLLIElement>("li[data-event-id]"));
        const firstVisibleIndex = items.findIndex((item) => item.getBoundingClientRect().top >= containerTop);

        return firstVisibleIndex !== -1 && firstVisibleIndex < PAGINATION_TRIGGER_ITEM_INDEX;
    }

    function isViewportNotFilled() {
        return messageListRef ? messageListRef.scrollHeight <= messageListRef.clientHeight : false;
    }

    function onDropFiles(event: DragEvent) {
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            messageInputBarRef?.handleFiles(event.dataTransfer.files);
        }
    }

    async function focusTimelineEvent(request: RoomTimelineFocusRequest) {
        if (!hasPendingTimelineFocusRequest(request)) {
            return;
        }

        await tick();

        let target = Array.from(messageListRef?.querySelectorAll<HTMLLIElement>("li[data-event-id]") ?? []).find(
            (element) => element.dataset.eventId === request.eventId,
        );

        if (!target) {
            const wasMadeVisible = (await room.ensureTimelineEventVisible?.(request.eventId)) ?? false;
            if (wasMadeVisible) {
                await tick();
                target = Array.from(messageListRef?.querySelectorAll<HTMLLIElement>("li[data-event-id]") ?? []).find(
                    (element) => element.dataset.eventId === request.eventId,
                );
            }
        }

        if (!target) {
            return;
        }

        lastTimelineFocusSequence = request.sequence;
        // Focusing an arbitrary event is an explicit un-pin: otherwise a ResizeObserver firing while
        // autoScroll is still true would drag us back to the bottom.
        autoScroll = false;
        releaseScrollAnchor();
        beginProgrammaticScroll("resync");
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        target.classList.remove("highlight-message");
        // // Force the highlight animation to restart when the same poll is clicked again.
        // target.offsetWidth;
        target.classList.add("highlight-message");
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="flex flex-col flex-auto h-full w-full max-w-full"
    data-testid={timelineTestId}
    ondragover={(event) => event.preventDefault()}
    ondrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDropFiles(event);
    }}
>
    {#if room !== undefined}
        <div class="flex flex-col gap-2">
            <div
                class="p-2 flex items-center border border-solid border-x-0 border-b border-t-0 border-white/10 {shouldReserveHeaderEndSpace
                    ? 'pe-14'
                    : ''}"
            >
                {#if chatRoomsEnableInAdmin}
                    <button
                        class="back-roomlist p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 !text-white shrink-0"
                        data-testid={backButtonTestId}
                        onclick={goBackAndClearSelectedChatMessage}
                    >
                        {#if direction === "rtl"}
                            <IconChevronRight font-size="20" />
                        {:else}
                            <IconChevronLeft font-size="20" />
                        {/if}
                    </button>
                {:else}
                    <div class="p-3 rounded aspect-square w-12 h-12 shrink-0"></div>
                {/if}
                <div class="text-sm font-bold min-w-0 grow text-center px-2 truncate" data-testid="roomName">
                    {$roomName}
                </div>

                {#if showRoomSidePanelToggle}
                    <button
                        type="button"
                        class="relative p-3 rounded aspect-square w-12 h-12 shrink-0 !text-white hover:bg-white/10 {roomSidePanelToggleIsOpen
                            ? 'bg-white/10'
                            : ''}"
                        data-testid="toggleRoomSidePanelButton"
                        title={roomSidePanelToggleIsOpen
                            ? $LL.chat.roomPanel.toggleClose()
                            : $LL.chat.roomPanel.toggleOpen()}
                        aria-pressed={roomSidePanelToggleIsOpen}
                        onclick={() => roomSidePanelStore.toggle()}
                    >
                        <IconInfoCircle font-size="20" />
                        {#if unreadSidePanelCount > 0}
                            <span
                                class="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-solid border-contrast bg-success"
                                data-testid="toggleRoomSidePanelUnreadBadge"
                            ></span>
                        {/if}
                    </button>
                {:else}
                    <div class="p-3 rounded aspect-square w-12 h-12 shrink-0" aria-hidden="true"></div>
                {/if}
            </div>
            {#if shouldDisplayLoader}
                <div class="flex justify-center items-center w-full pb-1 bg-transparent">
                    <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={25} />
                </div>
            {/if}
        </div>
        <div
            bind:this={messageListRef}
            class="flex overflow-auto h-full justify-center items-end relative"
            onscroll={handleScroll}
            onwheel={cancelProgrammaticScroll}
            ontouchstart={cancelProgrammaticScroll}
        >
            <ul
                class="list-none p-0 flex-1 flex flex-col max-w-full max-h-full pt-10 gap-1 {$timelineItems.length === 0
                    ? 'items-center justify-center pb-4'
                    : 'max-w-6xl'}"
            >
                {#if $initializationState === "loading" || $initializationState === "idle"}
                    <li class="flex flex-col items-center justify-center gap-3 text-center px-3 max-w-md">
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={32} />
                    </li>
                {:else if $initializationState === "error"}
                    <li class="flex flex-col items-center justify-center gap-3 text-center px-3 max-w-md">
                        <div class="text-lg font-bold text-center">{$LL.chat.connectionError()}</div>
                        <div class="text-sm opacity-50 text-center">
                            {$initializationError?.message ?? ""}
                        </div>
                        <button
                            class="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
                            onclick={retryInitialization}
                        >
                            {$LL.chat.timeLine.retry()}
                        </button>
                    </li>
                {:else if $timelineItems.length === 0}
                    {#if room instanceof ProximityChatRoom}
                        <li class="text-center px-3 max-w-md">
                            <img class="mx-auto" draggable="false" src={getCloseImg} alt={$LL.chat.getCloserTitle()} />
                            <div class="text-lg font-bold text-center">{$LL.chat.getCloserTitle()}</div>
                            <div class="text-sm opacity-50 text-center">
                                {$LL.chat.getCloserDesc()}
                            </div>
                        </li>
                    {:else}
                        <li class="text-center px-3 max-w-md relative">
                            <IconMailBox font-size="40" />
                            <div class="text-lg font-bold text-center">{$LL.chat.noMessage()}</div>
                            <div class="text-sm opacity-50 text-center">{$LL.chat.beFirst()}</div>
                            <div class="absolute w-10 h-10 -bottom-1.5 -left-10">
                                <svg
                                    width="51"
                                    height="45"
                                    viewBox="0 0 51 45"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M7.46934 42.1088C7.31199 42.9222 7.84378 43.7091 8.65713 43.8664C9.47048 44.0238 10.2574 43.492 10.4147 42.6786L7.46934 42.1088ZM48.8329 3.45148C49.6538 3.34051 50.2294 2.58502 50.1184 1.76406C50.0074 0.943102 49.2519 0.367545 48.431 0.47852L48.8329 3.45148ZM3.03603 31.9911C2.60916 31.2811 1.68756 31.0516 0.977578 31.4785C0.267597 31.9053 0.038091 32.8269 0.464962 33.5369L3.03603 31.9911ZM7.22548 41.8701L5.93995 42.643L5.94067 42.6442L7.22548 41.8701ZM10.842 42.9209L10.2291 41.5518L10.2278 41.5524L10.842 42.9209ZM21.7611 39.6758C22.5172 39.3373 22.8557 38.4499 22.5172 37.6938C22.1787 36.9377 21.2913 36.5992 20.5352 36.9377L21.7611 39.6758ZM8.94203 42.3937C10.4147 42.6786 10.4147 42.679 10.4146 42.6792C10.4146 42.6792 10.4146 42.6794 10.4146 42.6794C10.4146 42.6794 10.4146 42.6792 10.4147 42.6786C10.4149 42.6776 10.4153 42.6755 10.416 42.6723C10.4172 42.666 10.4193 42.6556 10.4222 42.641C10.4281 42.612 10.4375 42.5667 10.4504 42.5059C10.4762 42.3842 10.5163 42.2006 10.5721 41.9611C10.6837 41.4819 10.8576 40.7796 11.1039 39.9023C11.5969 38.1466 12.3779 35.6973 13.5261 32.9384C15.8321 27.3978 19.5724 20.7218 25.3326 15.8605L23.3977 13.5678C17.1251 18.8616 13.1538 26.0254 10.7564 31.7857C9.55296 34.6773 8.73434 37.2439 8.21562 39.0914C7.95608 40.0157 7.77112 40.7618 7.6503 41.2807C7.58987 41.5402 7.54545 41.743 7.51573 41.883C7.50087 41.953 7.48968 42.0074 7.48201 42.0452C7.47817 42.0642 7.47521 42.079 7.4731 42.0896C7.47205 42.095 7.47121 42.0992 7.47059 42.1024C7.47027 42.104 7.47001 42.1054 7.46981 42.1064C7.4697 42.107 7.46959 42.1076 7.46953 42.1078C7.46943 42.1084 7.46934 42.1088 8.94203 42.3937ZM25.3326 15.8605C37.1451 5.89135 46.5336 3.76229 48.8329 3.45148L48.431 0.47852C45.5724 0.86493 35.6508 3.2269 23.3977 13.5678L25.3326 15.8605ZM0.464962 33.5369L5.93995 42.643L8.51102 41.0972L3.03603 31.9911L0.464962 33.5369ZM5.94067 42.6442C7.08293 44.54 9.46921 45.1811 11.4562 44.2894L10.2278 41.5524C9.52671 41.8671 8.81489 41.6015 8.51029 41.096L5.94067 42.6442ZM11.4549 44.29L21.7611 39.6758L20.5352 36.9377L10.2291 41.5518L11.4549 44.29Z"
                                        fill="#FAF7F0"
                                    />
                                </svg>
                            </div>
                        </li>
                    {/if}
                {/if}
                {#each renderItems as item (item.key)}
                    <li class="last:pb-3" data-event-id={item.kind === "item" ? item.timelineItem.id : undefined}>
                        {#if item.kind === "separator"}
                            <div class="flex justify-center items-center pt-3 pb-1 px-6">
                                <span class="text-xs font-condensed min-w-32 text-center block opacity-75 py-1.5 px-3"
                                    >{item.label}</span
                                >
                            </div>
                        {:else if item.timelineItem.kind === "system"}
                            <MessageSystem message={item.timelineItem.message} />
                        {:else if item.timelineItem.kind === "poll"}
                            <PollCard poll={item.timelineItem.poll} />
                        {:else}
                            <Message
                                message={item.timelineItem.message}
                                showHeader={item.showHeader}
                                membersForMessageAvatars={room.membersForMessageAvatars}
                                showThreadSummary={room.conversationKind === "room"}
                            />
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>

        {#if $initializationState === "ready" && $typingMembers.length > 0}
            <TypingUsers typingMembers={$typingMembers} />
        {/if}
        {#key room}
            <MessageInputBar
                disabled={$shouldRetrySendingEvents || $initializationState !== "ready"}
                {room}
                bind:this={messageInputBarRef}
            />
        {/key}
    {/if}
</div>

<style>
    :global(li.highlight-message) {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        animation: highlight-pulse 2s ease-out;
    }

    @keyframes highlight-pulse {
        0% {
            background-color: rgba(255, 255, 255, 0.3);
        }
        100% {
            background-color: rgba(255, 255, 255, 0.1);
        }
    }
</style>
