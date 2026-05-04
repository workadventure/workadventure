<script lang="ts">
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import type { ChatPollItem } from "../../Connection/ChatConnection";
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

    $: senderDisplayName =
        poll.sender?.username && poll.sender.username !== poll.sender.chatId ? poll.sender.username : undefined;

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

    async function voteFromAnswerClick(answerId: string) {
        if ($state.isEnded || !$canVote || isSubmittingVote) {
            return;
        }

        errorMessage = undefined;
        const nextSelection = computeNextSelection(answerId);

        if (haveSameSelection(nextSelection, $state.myAnswerIds)) {
            return;
        }

        isSubmittingVote = true;
        isDirty = true;
        localSelection = [...nextSelection];

        try {
            await poll.vote(nextSelection);
            isDirty = false;
        } catch (error) {
            console.error("Failed to submit poll vote", error);
            errorMessage = $LL.chat.poll.submitError();
            isDirty = false;
        } finally {
            // eslint-disable-next-line require-atomic-updates
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
            errorMessage = $LL.chat.poll.deleteError();
        } finally {
            isDeletingPoll = false;
        }
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
                {@const selected = localSelection.includes(answer.id)}
                <button
                    type="button"
                    data-testid={`pollAnswer-${answer.id}`}
                    aria-pressed={selected}
                    class={`poll-answer text-left rounded-xl border px-3 py-3 relative overflow-hidden ${
                        !selected
                            ? "border-white/10 hover:border-white/30 hover:bg-white/[0.06] active:border-light-blue/60 active:bg-light-blue/10 active:scale-[0.985]"
                            : "border-white/30 bg-white/10"
                    } ${$state.isEnded || !$canVote ? "cursor-default" : "hover:-translate-y-[1px]"}`}
                    disabled={$state.isEnded || !$canVote || isSubmittingVote}
                    on:click={() => voteFromAnswerClick(answer.id)}
                >
                    {#if $state.resultsVisible}
                        <div
                            class={`absolute inset-y-0 left-0 bg-white/10 pointer-events-none ${
                                answer.isWinning ? "bg-emerald-400/20" : ""
                            }`}
                            style:width={answer.votes > 0 ? `${Math.max(answer.percentage, 8)}%` : "0%"}
                        />
                    {/if}
                    <div class="relative z-10 flex items-center justify-between gap-4">
                        <div class="flex items-center gap-2 min-w-0">
                            <div
                                class={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-all duration-150 ${
                                    selected ? "border-white/30 bg-white/20" : "border-white/20"
                                }`}
                            >
                                {#if selected}
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
                {#if !$state.isEnded && $canEnd}
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
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        will-change: transform, border-color, background-color, box-shadow;
        transition: transform 0.08s ease, border-color 0.08s ease, background-color 0.08s ease, box-shadow 0.08s ease;
    }

    .poll-answer:not(:disabled):active {
        transform: scale(0.985);
    }
</style>
