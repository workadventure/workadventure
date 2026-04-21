<script lang="ts">
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import type { ChatPollAnswer, ChatPollItem } from "../../Connection/ChatConnection";
    import { IconCheck, IconList, IconLoader, IconTrash } from "@wa-icons";

    export let poll: ChatPollItem;

    const { state, date, canVote, canEnd, canDelete } = poll;

    let localSelection: string[] = [];
    let isDirty = false;
    let isSubmittingVote = false;
    let isEndingPoll = false;
    let isDeletingPoll = false;
    let errorMessage: string | undefined;

    $: if (!isDirty) {
        localSelection = [...$state.myAnswerIds];
    }

    $: hasSelectionChanged = !haveSameSelection(localSelection, $state.myAnswerIds);
    $: canSubmitVote = $canVote && hasSelectionChanged && !isSubmittingVote;
    $: senderDisplayName =
        poll.sender?.username && poll.sender.username !== poll.sender.chatId ? poll.sender.username : undefined;

    function toggleAnswer(answerId: string) {
        if ($state.isEnded) {
            return;
        }

        errorMessage = undefined;
        isDirty = true;

        if ($state.maxSelections === 1) {
            localSelection = localSelection[0] === answerId ? [] : [answerId];
            return;
        }

        if (localSelection.includes(answerId)) {
            localSelection = localSelection.filter((existingAnswerId) => existingAnswerId !== answerId);
            return;
        }

        if (localSelection.length >= $state.maxSelections) {
            localSelection = [...localSelection.slice(1), answerId];
            return;
        }

        localSelection = [...localSelection, answerId];
    }

    async function submitVote() {
        if (!canSubmitVote) {
            return;
        }

        isSubmittingVote = true;
        errorMessage = undefined;
        try {
            await poll.vote(localSelection);
            isDirty = false;
        } catch (error) {
            console.error("Failed to submit poll vote", error);
            errorMessage = $LL.chat.poll.submitError();
        } finally {
            isSubmittingVote = false;
        }
    }

    async function clearVote() {
        isSubmittingVote = true;
        errorMessage = undefined;
        try {
            await poll.vote([]);
            localSelection = [];
            isDirty = false;
        } catch (error) {
            console.error("Failed to clear poll vote", error);
            errorMessage = $LL.chat.poll.submitError();
        } finally {
            isSubmittingVote = false;
        }
    }

    async function endPoll() {
        isEndingPoll = true;
        errorMessage = undefined;
        try {
            await poll.end();
        } catch (error) {
            console.error("Failed to end poll", error);
            errorMessage = $LL.chat.poll.endError();
        } finally {
            isEndingPoll = false;
        }
    }

    async function deletePoll() {
        isDeletingPoll = true;
        errorMessage = undefined;
        try {
            await poll.remove();
        } catch (error) {
            console.error("Failed to delete poll", error);
            errorMessage = $LL.chat.poll.endError();
        } finally {
            isDeletingPoll = false;
        }
    }

    function isSelected(answerId: string) {
        return localSelection.includes(answerId);
    }

    function answerBarStyle(answer: ChatPollAnswer) {
        return `width: ${Math.max(answer.percentage, answer.votes > 0 ? 8 : 0)}%`;
    }

    function haveSameSelection(left: string[], right: string[]) {
        if (left.length !== right.length) {
            return false;
        }

        const leftSorted = [...left].sort();
        const rightSorted = [...right].sort();
        return leftSorted.every((answerId, index) => answerId === rightSorted[index]);
    }
</script>

<div class="px-3">
    <div data-testid="pollCard" class="poll-card rounded-2xl bg-contrast/90 border border-white/10 p-4 max-w-2xl">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="text-xs uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <IconList font-size={14} />
                    <span>{$LL.chat.poll.title()}</span>
                </div>
                <div data-testid="pollQuestion" class="text-lg font-bold text-white mt-2 overflow-wrap-anywhere">
                    {$state.question}
                </div>
                <div class="text-xs text-white/50 mt-1 flex flex-wrap gap-2">
                    {#if senderDisplayName}
                        <span data-testid="pollCreatorName">{senderDisplayName}</span>
                    {/if}
                    {#if date}
                        <span
                            >{date.toLocaleTimeString($locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}</span
                        >
                    {/if}
                </div>
            </div>
        </div>

        <div class="mt-4 flex flex-col gap-2">
            {#each $state.answers as answer (answer.id)}
                <button
                    data-testid={`pollAnswer-${answer.id}`}
                    class={`poll-answer text-left rounded-xl border border-white/10 px-3 py-3 relative overflow-hidden ${
                        isSelected(answer.id) ? "bg-white/10 border-white/30" : ""
                    } ${$state.isEnded ? "cursor-default" : ""}`}
                    disabled={$state.isEnded}
                    on:click={() => toggleAnswer(answer.id)}
                >
                    {#if $state.resultsVisible}
                        <div
                            class={`absolute inset-y-0 left-0 bg-white/10 pointer-events-none ${
                                answer.isWinning ? "bg-emerald-400/20" : ""
                            }`}
                            style={answerBarStyle(answer)}
                        />
                    {/if}
                    <div class="relative z-10 flex items-center justify-between gap-4">
                        <div class="flex items-center gap-2 min-w-0">
                            <div
                                class={`h-5 w-5 shrink-0 rounded-full border border-white/20 flex items-center justify-center ${
                                    isSelected(answer.id) ? "bg-white/20" : ""
                                }`}
                            >
                                {#if isSelected(answer.id)}
                                    <IconCheck font-size={14} />
                                {/if}
                            </div>
                            <span class="truncate">{answer.text}</span>
                        </div>
                        {#if $state.resultsVisible}
                            <div class="text-xs text-white/70 shrink-0">{answer.votes} ({answer.percentage}%)</div>
                        {/if}
                    </div>
                </button>
            {/each}
        </div>

        <div class="mt-4 text-xs text-white/60 flex flex-wrap gap-3">
            <span data-testid="pollParticipantsCount">{$LL.chat.poll.participants({ count: $state.totalVotes })}</span>
            {#if $state.maxSelections > 1}
                <span>{$LL.chat.poll.multiSelect({ count: $state.maxSelections })}</span>
            {/if}
            {#if $state.spoiledVotes > 0}
                <span>{$LL.chat.poll.spoiledVotes({ count: $state.spoiledVotes })}</span>
            {/if}
        </div>

        {#if !$state.resultsVisible && !$state.isEnded}
            <div class="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70">
                {$state.kind === "open" ? $LL.chat.poll.resultsAfterVote() : $LL.chat.poll.resultsWhenClosed()}
            </div>
        {/if}

        {#if $state.isEnded}
            <div data-testid="pollClosedNotice" class="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80">
                {$LL.chat.poll.closed()}
                {#if $state.closingMessage}
                    <div class="mt-1 text-white/60">{$state.closingMessage}</div>
                {/if}
            </div>
        {/if}

        {#if errorMessage}
            <div class="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</div>
        {/if}

        {#if !$state.isEnded || $canDelete}
            <div class="mt-4 flex flex-wrap gap-2">
                {#if !$state.isEnded}
                    <button
                        data-testid="submitPollVoteButton"
                        class="btn btn-light btn-border"
                        disabled={!canSubmitVote}
                        on:click={submitVote}
                    >
                        {#if isSubmittingVote}
                            <IconLoader class="animate-[spin_2s_linear_infinite] mr-2" font-size={16} />
                        {/if}
                        {$state.hasVoted ? $LL.chat.poll.updateVote() : $LL.chat.poll.vote()}
                    </button>
                    {#if $state.hasVoted}
                        <button
                            data-testid="clearPollVoteButton"
                            class="btn btn-light btn-border"
                            disabled={isSubmittingVote}
                            on:click={clearVote}
                        >
                            {$LL.chat.poll.removeVote()}
                        </button>
                    {/if}
                    {#if $canEnd}
                        <button
                            data-testid="endPollButton"
                            class="btn btn-danger"
                            disabled={isEndingPoll}
                            on:click={endPoll}
                        >
                            {#if isEndingPoll}
                                <IconLoader class="animate-[spin_2s_linear_infinite] mr-2" font-size={16} />
                            {/if}
                            {$LL.chat.poll.end.cta()}
                        </button>
                    {/if}
                {/if}
                {#if $canDelete}
                    <button
                        data-testid="deletePollButton"
                        class="btn btn-light btn-border"
                        disabled={isDeletingPoll}
                        on:click={deletePoll}
                    >
                        {#if isDeletingPoll}
                            <IconLoader class="animate-[spin_2s_linear_infinite] mr-2" font-size={16} />
                        {:else}
                            <IconTrash class="mr-2" font-size={16} />
                        {/if}
                        {$LL.chat.delete()}
                    </button>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .overflow-wrap-anywhere {
        overflow-wrap: anywhere;
    }

    .poll-answer {
        transition: border-color 0.15s ease, background-color 0.15s ease;
    }
</style>
