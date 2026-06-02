<script lang="ts">
    import { get, readable } from "svelte/store";
    import type { ChatQuestionItem, ProximityChatSidePanelRoom } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";

    interface Props {
        room: ProximityChatSidePanelRoom;
    }

    let { room }: Props = $props();

    const emptyQuestionItems = readable<readonly ChatQuestionItem[]>([]);
    const cannotCreateQuestion = readable(false);
    let draftQuestion = $state("");
    let activeFilter: "open" | "answered" = $state("open");

    let questionItems = $derived(room.qaItems ?? emptyQuestionItems);
    let questionCreation = $derived(room.questionCreation);
    let canCreateQuestionStore = $derived(questionCreation?.canCreate ?? cannotCreateQuestion);
    let canCreateQuestion = $derived($canCreateQuestionStore);
    let maxQuestionLength = $derived(questionCreation?.maxLength ?? 500);
    let filteredQuestions = $derived(
        $questionItems.filter((question) => get(question.state).isAnswered === (activeFilter === "answered")),
    );
    let openQuestionCount = $derived($questionItems.filter((question) => !get(question.state).isAnswered).length);
    let answeredQuestionCount = $derived($questionItems.length - openQuestionCount);

    function createQuestion(): void {
        const body = draftQuestion.trim();
        if (!questionCreation || body.length === 0 || body.length > maxQuestionLength) {
            return;
        }

        questionCreation
            .create({ body })
            .then(() => {
                draftQuestion = "";
            })
            .catch((error) => console.error("Failed to create proximity question", error));
    }

    function toggleUpvote(question: ChatQuestionItem): void {
        question.toggleUpvote().catch((error) => console.error("Failed to update question upvote", error));
    }

    function markAnswered(question: ChatQuestionItem): void {
        question.markAnswered().catch((error) => console.error("Failed to mark question as answered", error));
    }

    function removeQuestion(question: ChatQuestionItem): void {
        question.remove().catch((error) => console.error("Failed to delete question", error));
    }

    function getFilterClass(filter: "open" | "answered"): string {
        const activeClass = "border-white/25 bg-white/[0.14] text-white";
        const inactiveClass = "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.1]";
        return `m-0 rounded-full border border-solid px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeFilter === filter ? activeClass : inactiveClass
        }`;
    }

    function getUpvoteClass(hasUpvoted: boolean): string {
        const activeClass = "border-yellow-300/35 bg-yellow-400/15 text-yellow-100";
        const inactiveClass = "border-white/10 bg-black/15 text-white/80 hover:bg-white/10";
        return `m-0 flex items-center gap-1 rounded-full border border-solid px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            hasUpvoted ? activeClass : inactiveClass
        }`;
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="proximityRoomSidePanelQuestions">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-4">
        <form
            class="flex flex-col gap-2"
            onsubmit={(event) => {
                event.preventDefault();
                createQuestion();
            }}
        >
            <label class="text-xs font-bold uppercase tracking-widest text-white/55" for="proximity-question-input">
                {$LL.chat.question.ask()}
            </label>
            <textarea
                id="proximity-question-input"
                class="m-0 min-h-20 resize-none rounded-lg border border-solid border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                maxlength={maxQuestionLength}
                placeholder={$LL.chat.question.placeholder()}
                bind:value={draftQuestion}
                disabled={!canCreateQuestion}
                data-testid="proximityQuestionInput"
            ></textarea>
            <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-white/45">{draftQuestion.trim().length}/{maxQuestionLength}</span>
                <button
                    type="submit"
                    class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.08] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!canCreateQuestion || draftQuestion.trim().length === 0}
                    data-testid="proximityQuestionSubmit"
                >
                    {$LL.chat.question.send()}
                </button>
            </div>
        </form>
    </div>

    <div class="flex items-center gap-2 px-3 py-3">
        <button
            type="button"
            class={getFilterClass("open")}
            onclick={() => (activeFilter = "open")}
            data-testid="proximityQuestionsOpenFilter"
        >
            {$LL.chat.question.toAnswer({ count: openQuestionCount })}
        </button>
        <button
            type="button"
            class={getFilterClass("answered")}
            onclick={() => (activeFilter = "answered")}
            data-testid="proximityQuestionsAnsweredFilter"
        >
            {$LL.chat.question.answeredFilter({ count: answeredQuestionCount })}
        </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {#if filteredQuestions.length === 0}
            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
                {activeFilter === "open" ? $LL.chat.question.emptyOpen() : $LL.chat.question.emptyAnswered()}
            </div>
        {:else}
            <div class="flex flex-col gap-2">
                {#each filteredQuestions as question (question.id)}
                    {@const state = get(question.state)}
                    <article
                        class="rounded-lg border border-solid border-white/10 bg-white/[0.04] p-3 text-white"
                        data-testid="proximityQuestionItem"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <p class="m-0 whitespace-pre-wrap text-sm leading-5">{state.body}</p>
                                <div class="mt-2 text-xs text-white/45">
                                    {state.senderName ?? $LL.chat.question.unknownAuthor()} · {new Date(
                                        state.createdAt
                                    ).toLocaleTimeString()}
                                </div>
                            </div>
                            <div class="flex shrink-0 items-center gap-1.5">
                                {#if state.isAnswered}
                                    <span
                                        class="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100"
                                    >
                                        {$LL.chat.question.answered()}
                                    </span>
                                {/if}

                                <button
                                    type="button"
                                    class={getUpvoteClass(state.hasUpvoted)}
                                    disabled={!state.canUpvote}
                                    aria-label={$LL.chat.question.upvote()}
                                    data-testid="proximityQuestionUpvoteButton"
                                    onclick={() => toggleUpvote(question)}
                                >
                                    <span aria-hidden="true">👍</span>
                                    <span>{state.upvoteCount}</span>
                                </button>
                            </div>
                        </div>

                        <div class="mt-3 flex flex-wrap items-center gap-2">
                            {#if state.canMarkAnswered}
                                <button
                                    type="button"
                                    class="m-0 rounded-full border border-solid border-emerald-300/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20"
                                    data-testid="proximityQuestionMarkAnsweredButton"
                                    onclick={() => markAnswered(question)}
                                >
                                    {$LL.chat.question.markAnswered()}
                                </button>
                            {/if}

                            {#if state.canDelete}
                                <button
                                    type="button"
                                    class="m-0 rounded-full border border-solid border-red-300/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20"
                                    data-testid="proximityQuestionDeleteButton"
                                    onclick={() => removeQuestion(question)}
                                >
                                    {$LL.chat.delete()}
                                </button>
                            {/if}
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    </div>
</div>
