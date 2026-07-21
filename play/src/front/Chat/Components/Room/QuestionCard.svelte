<script lang="ts">
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import type { ChatQuestionItem } from "../../Connection/ChatConnection";
    import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
    import { IconCheck, IconHelpCircle, IconList, IconLoader, IconTrash } from "@wa-icons";

    interface Props {
        question: ChatQuestionItem;
    }

    let { question }: Props = $props();

    let questionState = $derived(question.state);
    let isUpvoting = $state(false);
    let isMarkingAnswered = $state(false);
    let isDeleting = $state(false);

    function toggleUpvote() {
        if (!$questionState.canUpvote || isUpvoting) {
            return;
        }

        isUpvoting = true;
        question
            .toggleUpvote()
            .catch((error) => console.error("Failed to update question upvote", error))
            .finally(() => {
                isUpvoting = false;
            });
    }

    function markAnswered() {
        if (!$questionState.canMarkAnswered || isMarkingAnswered) {
            return;
        }

        isMarkingAnswered = true;
        question
            .markAnswered()
            .catch((error) => console.error("Failed to mark question as answered", error))
            .finally(() => {
                isMarkingAnswered = false;
            });
    }

    function removeQuestion() {
        if (!$questionState.canDelete || isDeleting) {
            return;
        }

        isDeleting = true;
        question
            .remove()
            .catch((error) => console.error("Failed to delete question", error))
            .finally(() => {
                isDeleting = false;
            });
    }

    function openQuestionsPanel() {
        roomSidePanelStore.setActiveSection("questions");
    }
</script>

<div class="px-3">
    <div
        data-testid="questionCard"
        class="question-card rounded-2xl bg-contrast/90 border border-solid border-white/10 border-l-4 border-l-yellow-300/70 p-4 max-w-2xl"
    >
        <div class="flex flex-wrap items-center gap-2">
            <span
                class="flex items-center gap-1 rounded-full border border-solid border-yellow-300/35 bg-yellow-400/15 px-2 py-0.5 text-xxs font-bold uppercase text-yellow-100"
            >
                <IconHelpCircle font-size={12} />
                {$LL.chat.question.badge()}
            </span>
            {#if $questionState.isAnswered}
                <span
                    class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xxs font-bold uppercase text-emerald-100"
                    data-testid="questionAnsweredBadge"
                >
                    {$LL.chat.question.answered()}
                </span>
            {/if}
        </div>

        <div class="mt-2 whitespace-pre-wrap text-sm font-semibold text-white overflow-wrap-anywhere">
            {$questionState.body}
        </div>

        <div class="mt-2 text-xs text-white/55">
            {$questionState.senderName ?? $LL.chat.question.unknownAuthor()} · {new Date(
                $questionState.createdAt,
            ).toLocaleTimeString($locale, { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
                type="button"
                class="m-0 flex items-center gap-1.5 rounded-full border border-solid px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 {$questionState.hasUpvoted
                    ? 'border-yellow-300/35 bg-yellow-400/15 text-yellow-100'
                    : 'border-white/10 bg-black/15 text-white/80 hover:bg-white/10'}"
                disabled={!$questionState.canUpvote || isUpvoting}
                aria-label={$LL.chat.question.upvote()}
                aria-pressed={$questionState.hasUpvoted}
                data-testid="questionUpvoteButton"
                onclick={toggleUpvote}
            >
                <span aria-hidden="true">👍</span>
                <span data-testid="questionUpvoteCount">{$questionState.upvoteCount}</span>
            </button>

            {#if $questionState.canMarkAnswered}
                <button
                    type="button"
                    class="m-0 flex items-center gap-1.5 rounded-full border border-solid border-emerald-300/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={isMarkingAnswered}
                    data-testid="questionMarkAnsweredButton"
                    onclick={markAnswered}
                >
                    {#if isMarkingAnswered}
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                    {:else}
                        <IconCheck font-size={14} />
                    {/if}
                    {$LL.chat.question.markAnswered()}
                </button>
            {/if}

            {#if $questionState.canDelete}
                <button
                    type="button"
                    class="m-0 flex items-center gap-1.5 rounded-full border border-solid border-red-300/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={isDeleting}
                    data-testid="questionDeleteButton"
                    onclick={removeQuestion}
                >
                    {#if isDeleting}
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                    {:else}
                        <IconTrash font-size={14} />
                    {/if}
                    {$LL.chat.delete()}
                </button>
            {/if}

            <button
                type="button"
                class="m-0 ms-auto flex items-center gap-1.5 rounded-full border border-solid border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                data-testid="questionViewAllButton"
                onclick={openQuestionsPanel}
            >
                <IconList font-size={14} />
                {$LL.chat.question.viewAll()}
            </button>
        </div>
    </div>
</div>

<style>
    .overflow-wrap-anywhere {
        overflow-wrap: anywhere;
    }
</style>
