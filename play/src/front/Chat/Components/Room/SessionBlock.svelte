<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import type { SessionChatMessage, ChatMessage } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import Message from "./Message.svelte";
    import SessionParticipantChip from "./SessionParticipantChip.svelte";
    import { IconChevronDown, IconChevronRight } from "@wa-icons";

    export let message: SessionChatMessage;

    const TIME_GAP_THRESHOLD = 5 * 60 * 1000;

    $: sessionData = message.sessionDataStore;
    $: data = $sessionData;
    $: isCurrentSession = data.endDate === undefined;
    $: summaryLabel = $LL.chat.timeLine.sessionSummary({ count: data.maxParticipants });
    $: viewHistoryLabel = $LL.chat.timeLine.sessionViewHistory();

    /** Current session is always expanded; past sessions start collapsed */
    let expanded = isCurrentSession;

    $: if (isCurrentSession) {
        expanded = true;
    }

    function toggleExpanded() {
        if (isCurrentSession) return;
        expanded = !expanded;
    }

    function formatSessionTime(d: Date): string {
        return new Intl.DateTimeFormat(undefined, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    }

    function formatDuration(start: Date, end: Date): string {
        const totalMs = end.getTime() - start.getTime();
        const totalMinutes = Math.floor(totalMs / 60_000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
            return $LL.chat.timeLine.sessionDurationHours({ hours: String(hours), minutes: String(minutes) });
        }
        return $LL.chat.timeLine.sessionDuration({ minutes: String(totalMinutes) });
    }

    $: durationLabel = data.endDate ? formatDuration(data.startDate, data.endDate) : null;

    /** For current session, show elapsed time (updates every minute). */
    let elapsedMinutes = 0;
    /** Ticker to force recompute of elapsedMinutes every minute; only read in reactive statement. */
    let elapsedTicker = 0;
    let elapsedInterval: ReturnType<typeof setInterval> | undefined;

    onMount(() => {
        const unsub = message.sessionDataStore.subscribe((sessionData) => {
            if (sessionData.endDate !== undefined && elapsedInterval !== undefined) {
                clearInterval(elapsedInterval);
                elapsedInterval = undefined;
            }
        });
        const initial = get(message.sessionDataStore);
        if (initial.endDate === undefined && initial.startDate) {
            elapsedInterval = setInterval(() => {
                elapsedTicker += 1;
            }, 60_000);
        }
        return () => {
            unsub();
            if (elapsedInterval !== undefined) clearInterval(elapsedInterval);
        };
    });

    $: elapsedMinutes =
        isCurrentSession && data.startDate
            ? (elapsedTicker, Math.floor((Date.now() - data.startDate.getTime()) / 60_000))
            : 0;

    $: currentSessionDurationLabel =
        isCurrentSession && elapsedMinutes >= 0
            ? elapsedMinutes >= 60
                ? $LL.chat.timeLine.sessionDurationHours({
                      hours: String(Math.floor(elapsedMinutes / 60)),
                      minutes: String(elapsedMinutes % 60),
                  })
                : $LL.chat.timeLine.sessionDuration({ minutes: String(elapsedMinutes) })
            : null;

    /** Participants list with current user first */
    $: sortedParticipants = [...(data.participants ?? [])].sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return 0;
    });

    /** No system events shown (no "New discussion...", "X left...", etc.) — only participants + messages */
    $: innerRenderItems = (() => {
        const out: Array<{ kind: "message"; message: ChatMessage; showHeader: boolean }> = [];
        let prevMsg: ChatMessage | undefined = undefined;
        for (const msg of data.messages) {
            const prevUserId = prevMsg?.sender?.spaceUserId ?? prevMsg?.sender?.chatId;
            const currUserId = msg.sender?.spaceUserId ?? msg.sender?.chatId;
            const timeDiff = msg.date && prevMsg?.date ? msg.date.getTime() - prevMsg.date.getTime() : Infinity;
            const isRepeatedSender = !!prevUserId && prevUserId === currUserId && timeDiff < TIME_GAP_THRESHOLD;
            out.push({
                kind: "message",
                message: msg,
                showHeader: !isRepeatedSender,
            });
            prevMsg = msg;
        }
        return out;
    })();
</script>

<div class="session-block rounded-lg border border-white/10 bg-white/5 overflow-hidden mx-1 mb-3">
    <button
        type="button"
        class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/10 transition-colors {isCurrentSession
            ? 'opacity-90'
            : ''}"
        on:click={toggleExpanded}
    >
        <span class="text-white/60 flex-shrink-0">
            {#if expanded}
                <IconChevronDown class="w-4 h-4" />
            {:else}
                <IconChevronRight class="w-4 h-4" />
            {/if}
        </span>
        <span class="messageTextBody text-white/90 font-medium flex-1 truncate">{summaryLabel}</span>
        {#if isCurrentSession}
            <span
                class="session-live-indicator flex items-center gap-1.5 flex-shrink-0"
                title={$LL.chat.timeLine.sessionInProgress()}
            >
                <span class="session-live-dot" aria-hidden="true" />
                <span class="text-xs text-green-400/90">{$LL.chat.timeLine.sessionInProgress()}</span>
            </span>
        {:else if !expanded}
            <span class="text-white/50 text-xs flex-shrink-0">{viewHistoryLabel}</span>
        {/if}
    </button>

    {#if expanded}
        <div class="session-content px-3 pb-3 pt-1 border-t border-white/10">
            <!-- Start / end date-time and duration -->
            <div class="text-xs text-white/60 mb-3 space-y-0.5">
                <div>{$LL.chat.timeLine.sessionStartedAt({ date: formatSessionTime(data.startDate) })}</div>
                {#if data.endDate}
                    <div>{$LL.chat.timeLine.sessionEndedAt({ date: formatSessionTime(data.endDate) })}</div>
                    {#if durationLabel}
                        <div class="text-white/50">{durationLabel}</div>
                    {/if}
                {:else if currentSessionDurationLabel}
                    <div class="text-white/50">{currentSessionDurationLabel}</div>
                {/if}
            </div>

            <!-- Participants list (current user first, count = total including you) -->
            {#if sortedParticipants.length > 0}
                <div class="mb-3">
                    <div class="text-xs font-medium text-white/70 mb-2">
                        {$LL.chat.timeLine.sessionParticipantsCount({ count: String(sortedParticipants.length) })}
                    </div>
                    <div class="flex flex-wrap gap-2">
                        {#each sortedParticipants as p (p.spaceUserId)}
                            <SessionParticipantChip participant={p} />
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Messages only (no "New discussion..." / "X left..." lines) -->
            {#if data.messages.length === 0}
                <p class="text-xs text-white/50 italic py-2">{$LL.chat.noMessage()}</p>
            {:else}
                {#each innerRenderItems as item (item.message.id)}
                    <div class="mb-2">
                        <Message message={item.message} showHeader={item.showHeader} />
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style>
    .session-block :global(.messageContainer) {
        margin-bottom: 0;
    }

    .session-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgb(74 222 128); /* green-400 */
        animation: session-live-pulse 1.5s ease-in-out infinite;
    }

    @keyframes session-live-pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.6;
            transform: scale(1.2);
        }
    }
</style>
