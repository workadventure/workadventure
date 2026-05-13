<script lang="ts">
    import { readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type {
        ChatPollAnswer,
        ChatPollItem,
        ChatRoomSidePanelHydrationState,
    } from "../../Connection/ChatConnection";
    import { IconCheck, IconLoader, IconMessageCircle2 } from "@wa-icons";

    export let poll: ChatPollItem;
    export let onFocusPoll: (() => Promise<void>) | (() => void);

    const readyHydrationState = readable<ChatRoomSidePanelHydrationState>({ status: "ready" });
    const { state, canVote } = poll;
    let localSelection: string[] = [];
    let isDirty = false;
    let isSubmittingVote = false;
    let hasVoteError = false;
    let isRetryingHydration = false;

    $: pollHydrationState = poll.hydrationState ?? readyHydrationState;
    $: isFallbackPoll = $pollHydrationState.status === "error" || $pollHydrationState.status === "loading";

    $: if (!isDirty) {
        localSelection = [...$state.myAnswerIds];
    }

    $: winningAnswers = $state.answers.filter((answer) => answer.isWinning);
    $: sortedAnswers = [...$state.answers].sort((left, right) => {
        if (left.isWinning !== right.isWinning) {
            return left.isWinning ? -1 : 1;
        }

        return right.votes - left.votes;
    });

    function getAnswerResult(answer: ChatPollAnswer) {
        return `${answer.votes} (${answer.percentage}%)`;
    }

    function computeNextSelection(answerId: string): string[] {
        if ($state.maxSelections === 1) {
            return localSelection[0] === answerId ? [] : [answerId];
        }

        if (localSelection.includes(answerId)) {
            return localSelection.filter((existingAnswerId) => existingAnswerId !== answerId);
        }

        if (localSelection.length >= $state.maxSelections) {
            return [...localSelection.slice(1), answerId];
        }

        return [...localSelection, answerId];
    }

    function voteFromAnswerClick(answerId: string) {
        if (isFallbackPoll || $state.isEnded || !$canVote || isSubmittingVote) {
            return;
        }

        hasVoteError = false;
        const nextSelection = computeNextSelection(answerId);

        if (haveSameSelection(nextSelection, $state.myAnswerIds)) {
            return;
        }

        isSubmittingVote = true;
        isDirty = true;
        localSelection = [...nextSelection];

        poll.vote(nextSelection)
            .catch((error) => {
                console.error("Failed to submit poll vote", error);
                hasVoteError = true;
            })
            .finally(() => {
                isDirty = false;
                isSubmittingVote = false;
            });
    }

    function haveSameSelection(left: string[], right: string[]) {
        if (left.length !== right.length) {
            return false;
        }

        const leftSorted = [...left].sort();
        const rightSorted = [...right].sort();
        return leftSorted.every((answerId, index) => answerId === rightSorted[index]);
    }

    function retryPollHydration() {
        if (!poll.retryHydration || isRetryingHydration) {
            return;
        }

        isRetryingHydration = true;
        poll.retryHydration()
            .catch((error) => {
                console.error("Failed to retry poll hydration", error);
            })
            .finally(() => {
                isRetryingHydration = false;
            });
    }
</script>

<div class="min-w-0">
    <div class="flex items-center gap-2">
        <span
            class="rounded-full border border-solid px-2 py-0.5 text-xxs font-bold uppercase {$state.isEnded
                ? 'border-white/10 bg-white/5 text-white/60'
                : 'border-success-900/30 bg-success-900/20 text-white'}"
            data-testid="roomSidePanelPollStatus"
        >
            {$state.isEnded ? $LL.chat.poll.kind.closed() : $LL.chat.poll.kind.open()}
        </span>
        {#if isFallbackPoll}
            <span class="text-xs text-white/50">
                {$pollHydrationState.status === "loading" ? "" : $LL.chat.roomPanel.status.pollDetailsUnavailable()}
            </span>
        {:else}
            <span class="text-xs text-white/50">{$LL.chat.poll.participants({ count: $state.totalVotes })}</span>
        {/if}
    </div>

    <div class="mt-2 line-clamp-2 text-sm font-semibold text-white" data-testid="roomSidePanelPollQuestion">
        {$state.question}
    </div>

    {#if poll.context.kind === "thread"}
        <div class="mt-2 flex items-center gap-1.5 text-xs text-white/55" data-testid="roomSidePanelPollThreadContext">
            <IconMessageCircle2 font-size={13} />
            <span class="truncate">
                {#if poll.context.threadSenderName}{poll.context.threadSenderName}: {/if}{poll.context.threadPreview ??
                    $LL.chat.thread.defaultPreview()}
            </span>
        </div>
    {/if}

    {#if isFallbackPoll}
        <div
            class="mt-3 rounded-lg border border-solid border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-white/60"
        >
            {#if $pollHydrationState.status === "loading"}
                <div class="flex items-center gap-2">
                    <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                </div>
            {:else}
                {$LL.chat.roomPanel.status.pollDetailsUnavailable()}
            {/if}
        </div>
    {:else if !$state.isEnded && $canVote}
        <div class="mt-3 flex flex-col gap-1.5">
            {#each $state.answers as answer (answer.id)}
                {@const selected = localSelection.includes(answer.id)}
                <button
                    type="button"
                    data-testid={`roomSidePanelPollAnswer-${answer.id}`}
                    aria-pressed={selected}
                    class="m-0 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-solid px-2.5 py-2 text-left text-xs transition-colors {selected
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08]'}"
                    disabled={isSubmittingVote}
                    on:click={() => voteFromAnswerClick(answer.id)}
                >
                    <span class="flex min-w-0 items-center gap-2">
                        <span
                            class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-solid {selected
                                ? 'border-white/30 bg-white/20'
                                : 'border-white/20'}"
                        >
                            {#if selected}
                                <IconCheck font-size={12} />
                            {/if}
                        </span>
                        <span class="truncate">{answer.text}</span>
                    </span>
                    {#if isSubmittingVote && selected}
                        <IconLoader class="shrink-0 animate-[spin_2s_linear_infinite]" font-size={13} />
                    {:else if $state.resultsVisible}
                        <span class="shrink-0 text-white/60">{getAnswerResult(answer)}</span>
                    {/if}
                </button>
            {/each}
        </div>
    {:else if $state.resultsVisible}
        <div class="mt-3 flex flex-col gap-1.5">
            {#each sortedAnswers.slice(0, 3) as answer (answer.id)}
                <div class="text-xs text-white/70">
                    <div class="mb-1 flex items-center justify-between gap-2">
                        <span class="truncate {answer.isWinning ? 'font-semibold text-white' : ''}">{answer.text}</span>
                        <span class="shrink-0">{getAnswerResult(answer)}</span>
                    </div>
                    <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                            class="h-full rounded-full {answer.isWinning ? 'bg-emerald-400/70' : 'bg-white/25'}"
                            style:width={`${answer.percentage}%`}
                        />
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    {#if !isFallbackPoll && !$state.resultsVisible && !$state.isEnded}
        <div class="mt-3 text-xs text-white/50">
            {$state.kind === "open" ? $LL.chat.poll.resultsAfterVote() : $LL.chat.poll.resultsWhenClosed()}
        </div>
    {/if}

    {#if $state.isEnded && !isFallbackPoll && winningAnswers.length > 0}
        <div class="mt-3 text-xs font-semibold text-white/80">
            {$LL.chat.roomPanel.pollWinner({ answer: winningAnswers.map((answer) => answer.text).join(", ") })}
        </div>
    {/if}

    {#if hasVoteError}
        <div class="mt-3 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs text-red-200">
            {$LL.chat.poll.submitError()}
        </div>
    {/if}

    <div class="mt-3 flex flex-wrap gap-2">
        {#if $pollHydrationState.status === "error" && poll.retryHydration}
            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                data-testid="roomSidePanelPollRetryButton"
                disabled={isRetryingHydration}
                on:click={retryPollHydration}
            >
                {#if isRetryingHydration}
                    <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                {:else}
                    {$LL.chat.roomPanel.status.retry()}
                {/if}
            </button>
        {/if}

        <button
            type="button"
            class="m-0 rounded-lg border border-solid border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            data-testid="roomSidePanelPollFocusButton"
            on:click={() => onFocusPoll()}
        >
            {$LL.chat.show()}
        </button>
    </div>
</div>
