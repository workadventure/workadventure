<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatPollAnswer, ChatPollItem } from "../../Connection/ChatConnection";

    export let poll: ChatPollItem;

    const state = poll.state;

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
        <span class="text-xs text-white/50">{$LL.chat.poll.participants({ count: $state.totalVotes })}</span>
    </div>

    <div class="mt-2 line-clamp-2 text-sm font-semibold text-white" data-testid="roomSidePanelPollQuestion">
        {$state.question}
    </div>

    {#if $state.resultsVisible}
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
    {:else if !$state.isEnded}
        <div class="mt-3 text-xs text-white/50">
            {$state.kind === "open" ? $LL.chat.poll.resultsAfterVote() : $LL.chat.poll.resultsWhenClosed()}
        </div>
    {/if}

    {#if $state.isEnded && winningAnswers.length > 0}
        <div class="mt-3 text-xs font-semibold text-white/80">
            {$LL.chat.roomPanel.pollWinner({ answer: winningAnswers.map((answer) => answer.text).join(", ") })}
        </div>
    {/if}
</div>
