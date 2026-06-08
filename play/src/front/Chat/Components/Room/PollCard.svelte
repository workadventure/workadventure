<script lang="ts">
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import type { ChatPollAnswer, ChatPollItem } from "../../Connection/ChatConnection";
    import { IconCheck, IconLoader, IconTrash } from "@wa-icons";

    interface Props {
        poll: ChatPollItem;
    }

    let { poll }: Props = $props();

    let { state: pollState, date, canVote, canEnd, canDelete } = $derived(poll);
    let localSelection: string[] = $state([]);
    let isDirty = $state(false);
    let isSubmittingVote = $state(false);
    let isEndingPoll = $state(false);
    let isDeletingPoll = $state(false);
    let errorMessage: string | undefined = $state();

    $effect(() => {
        if (!isDirty) {
            localSelection = [...$pollState.myAnswerIds];
        }
    });

    let senderDisplayName = $derived(
        poll.sender?.username && poll.sender.username !== poll.sender.chatId ? poll.sender.username : undefined,
    );
    let winningAnswers = $derived($pollState.answers.filter((answer) => answer.isWinning));
    let sortedAnswers = $derived(
        [...$pollState.answers].sort((left, right) => {
            if (left.isWinning !== right.isWinning) {
                return left.isWinning ? -1 : 1;
            }

            return right.votes - left.votes;
        }),
    );

    function getAnswerResult(answer: ChatPollAnswer) {
        return `${answer.votes} (${answer.percentage}%)`;
    }

    function computeNextSelection(answerId: string): string[] {
        if ($pollState.maxSelections === 1) {
            return localSelection[0] === answerId ? [] : [answerId];
        }

        if (localSelection.includes(answerId)) {
            return localSelection.filter((existingAnswerId) => existingAnswerId !== answerId);
        }

        if (localSelection.length >= $pollState.maxSelections) {
            return [...localSelection.slice(1), answerId];
        }

        return [...localSelection, answerId];
    }

    async function voteFromAnswerClick(answerId: string) {
        if ($pollState.isEnded || !$canVote || isSubmittingVote) {
            return;
        }

        errorMessage = undefined;
        const nextSelection = computeNextSelection(answerId);

        if (haveSameSelection(nextSelection, $pollState.myAnswerIds)) {
            return;
        }

        isSubmittingVote = true;
        isDirty = true;
        localSelection = [...nextSelection];

        try {
            await poll.vote(nextSelection);
        } catch (error) {
            console.error("Failed to submit poll vote", error);
            errorMessage = $LL.chat.poll.submitError();
        } finally {
            isDirty = false;
            // A second vote cannot start while this guarded request is in progress.
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
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
                <span
                    class="rounded-full border border-solid px-2 py-0.5 text-xxs font-bold uppercase {$pollState.isEnded
                        ? 'border-white/10 bg-white/5 text-white/60'
                        : 'border-success-900/30 bg-success-900/20 text-white'}"
                >
                    {$pollState.isEnded ? $LL.chat.poll.kind.closed() : $LL.chat.poll.kind.open()}
                </span>
                <span class="text-xs text-white/50" data-testid="pollParticipantsCount">
                    {$LL.chat.poll.participants({ count: $pollState.totalVotes })}
                </span>
                {#if $pollState.maxSelections > 1}
                    <span class="text-xs text-white/50">
                        {$LL.chat.poll.multiSelect({ count: $pollState.maxSelections })}
                    </span>
                {/if}
                {#if $pollState.spoiledVotes > 0}
                    <span class="text-xs text-white/50">
                        {$LL.chat.poll.spoiledVotes({ count: $pollState.spoiledVotes })}
                    </span>
                {/if}
            </div>

            <div data-testid="pollQuestion" class="mt-2 text-sm font-semibold text-white overflow-wrap-anywhere">
                {$pollState.question}
            </div>

            {#if senderDisplayName || date}
                <div class="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                    {#if senderDisplayName}
                        <span data-testid="pollCreatorName">{senderDisplayName}</span>
                    {/if}
                    {#if date}
                        <span>
                            {date.toLocaleTimeString($locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    {/if}
                </div>
            {/if}
        </div>

        {#if !$pollState.isEnded && $canVote}
            <div class="mt-3 flex flex-col gap-1.5">
                {#each $pollState.answers as answer (answer.id)}
                    {@const selected = localSelection.includes(answer.id)}
                    <button
                        type="button"
                        data-testid={`pollAnswer-${answer.id}`}
                        aria-pressed={selected}
                        class="m-0 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-solid px-2.5 py-2 text-left text-xs transition-colors {selected
                            ? 'border-white/30 bg-white/10 text-white'
                            : 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08]'}"
                        disabled={isSubmittingVote}
                        onclick={() => voteFromAnswerClick(answer.id)}
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
                        {:else if $pollState.resultsVisible}
                            <span class="shrink-0 text-white/60">{getAnswerResult(answer)}</span>
                        {/if}
                    </button>
                {/each}
            </div>
        {:else if $pollState.resultsVisible}
            <div class="mt-3 flex flex-col gap-1.5">
                {#each sortedAnswers as answer (answer.id)}
                    <div class="text-xs text-white/70">
                        <div class="mb-1 flex items-center justify-between gap-2">
                            <span class="truncate {answer.isWinning ? 'font-semibold text-white' : ''}">
                                {answer.text}
                            </span>
                            <span class="shrink-0">{getAnswerResult(answer)}</span>
                        </div>
                        <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                                class="h-full rounded-full {answer.isWinning ? 'bg-emerald-400/70' : 'bg-white/25'}"
                                style:width={`${answer.percentage}%`}
                            ></div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        {#if !$pollState.resultsVisible && !$pollState.isEnded}
            <div class="mt-3 text-xs text-white/50">
                {$pollState.kind === "open" ? $LL.chat.poll.resultsAfterVote() : $LL.chat.poll.resultsWhenClosed()}
            </div>
        {/if}

        {#if $pollState.isEnded && winningAnswers.length > 0}
            <div class="mt-3 text-xs font-semibold text-white/80" data-testid="pollClosedNotice">
                {$LL.chat.roomPanel.pollWinner({ answer: winningAnswers.map((answer) => answer.text).join(", ") })}
            </div>
        {/if}

        {#if $pollState.isEnded && $pollState.closingMessage}
            <div class="mt-2 rounded-lg bg-white/5 px-2.5 py-2 text-xs text-white/65">
                {$pollState.closingMessage}
            </div>
        {/if}

        {#if errorMessage}
            <div class="mt-3 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs text-red-200">{errorMessage}</div>
        {/if}

        {#if !$pollState.isEnded || $canDelete}
            <div class="mt-4 flex flex-wrap gap-2">
                {#if !$pollState.isEnded && $canEnd}
                    <button
                        type="button"
                        data-testid="endPollButton"
                        class="m-0 rounded-lg border border-solid border-danger-900/40 bg-danger-900/20 px-3 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-danger-900/30"
                        disabled={isEndingPoll}
                        onclick={endPoll}
                    >
                        {#if isEndingPoll}
                            <IconLoader class="animate-[spin_2s_linear_infinite] mr-2" font-size={16} />
                        {/if}
                        {$LL.chat.poll.end.cta()}
                    </button>
                {/if}
                {#if $canDelete}
                    <button
                        type="button"
                        data-testid="deletePollButton"
                        class="m-0 rounded-lg border border-solid border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                        disabled={isDeletingPoll}
                        onclick={deletePoll}
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
</style>
