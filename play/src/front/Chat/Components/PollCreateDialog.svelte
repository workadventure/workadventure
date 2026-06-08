<script lang="ts">
    import type { ChatPollCreationCapability, ChatPollKind } from "../Connection/ChatConnection";
    import Popup from "../../Components/Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { IconLoader, IconPlus, IconTrash } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        pollCreation: ChatPollCreationCapability;
    }

    let { pollCreation }: Props = $props();

    let limits = $derived(pollCreation.limits);
    let canCreatePoll = $derived(pollCreation.canCreate);
    let supportedKinds = $derived(pollCreation.supportedKinds);

    let question = $state("");
    let selectedKind: ChatPollKind = $state((() => supportedKinds[0] ?? "open")());
    let answers = $state((() => Array.from({ length: limits.minAnswers }, () => ""))());
    let errorMessage: string | undefined = $state();
    let isSubmitting = $state(false);

    let normalizedAnswers = $derived(answers.map((answer) => answer.trim()).filter((answer) => answer.length > 0));
    let canAddAnswer = $derived(answers.length < limits.maxAnswers);
    let hasInvalidAnswerLength = $derived(answers.some((answer) => answer.length > limits.answerMaxLength));
    let canSubmit = $derived(
        $canCreatePoll &&
            supportedKinds.length > 0 &&
            question.trim().length > 0 &&
            question.length <= limits.questionMaxLength &&
            normalizedAnswers.length >= limits.minAnswers &&
            !hasInvalidAnswerLength &&
            !isSubmitting,
    );

    function addAnswer() {
        if (!canAddAnswer) {
            return;
        }

        answers = [...answers, ""];
    }

    function removeAnswer(index: number) {
        if (answers.length <= limits.minAnswers) {
            return;
        }

        answers = answers.filter((_, answerIndex) => answerIndex !== index);
    }

    async function createPoll() {
        errorMessage = undefined;

        if (!canSubmit) {
            errorMessage = $LL.chat.poll.create.validationError();
            return;
        }

        isSubmitting = true;
        try {
            await pollCreation.create({
                question: question.trim(),
                answers: normalizedAnswers,
                kind: selectedKind,
            });
            modals.close();
        } catch (error) {
            console.error("Failed to create poll", error);
            errorMessage = $LL.chat.poll.create.submitError();
        } finally {
            isSubmitting = false;
        }
    }
</script>

<Popup isOpen withAction>
    {#snippet title()}
        <h1 class="text-2xl font-bold">{$LL.chat.poll.create.title()}</h1>
    {/snippet}

    {#snippet content()}
        <div class="w-full flex flex-col gap-4">
            <div class="w-full">
                <label class="text-sm font-bold mb-2 block" for="poll-question">{$LL.chat.poll.create.question()}</label
                >
                <textarea
                    data-testid="createPollQuestionInput"
                    id="poll-question"
                    bind:value={question}
                    rows={3}
                    maxlength={limits.questionMaxLength}
                    class="wa-searchbar block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 resize-none outline-none shadow-none focus:ring-0 focus:border-white/20"
                    placeholder={$LL.chat.poll.create.questionPlaceholder()}
                ></textarea>
                <div class="mt-1 text-xs text-white/50 text-right">{question.length}/{limits.questionMaxLength}</div>
            </div>

            <div class="w-full">
                <div class="flex items-center justify-between gap-3 mb-2">
                    <div class="text-sm font-bold block">{$LL.chat.poll.create.answers()}</div>
                    <button class="btn btn-light btn-ghost btn-sm" disabled={!canAddAnswer} onclick={addAnswer}>
                        <IconPlus font-size={16} class="mr-1" />
                        {$LL.chat.poll.create.addAnswer()}
                    </button>
                </div>

                <div class="flex flex-col gap-2">
                    {#each answers as answer, index (index)}
                        <div class="flex items-start gap-2">
                            <input
                                data-testid={`createPollAnswerInput-${index}`}
                                bind:value={answers[index]}
                                maxlength={limits.answerMaxLength}
                                class="wa-searchbar block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none shadow-none focus:ring-0 focus:border-white/20"
                                placeholder={$LL.chat.poll.create.answerPlaceholder({ index: index + 1 })}
                            />
                            <button
                                class="btn btn-light btn-ghost btn-sm mt-1"
                                disabled={answers.length <= limits.minAnswers}
                                onclick={() => removeAnswer(index)}
                            >
                                <IconTrash font-size={16} />
                            </button>
                        </div>
                    {/each}
                </div>

                <div class="mt-1 text-xs text-white/50">
                    {$LL.chat.poll.create.answerCount({ count: normalizedAnswers.length, max: limits.maxAnswers })}
                </div>
            </div>

            {#if supportedKinds.length > 1}
                <div class="w-full">
                    <div class="text-sm font-bold mb-2">{$LL.chat.poll.create.visibility()}</div>
                    <div class="grid grid-cols-2 gap-2">
                        {#if supportedKinds.includes("open")}
                            <button
                                data-testid="createPollVisibilityOpen"
                                class={`rounded-xl border border-white/10 p-3 text-left ${
                                    selectedKind === "open" ? "bg-white/10 border-white/30" : ""
                                }`}
                                onclick={() => (selectedKind = "open")}
                            >
                                <div class="font-bold">{$LL.chat.poll.kind.open()}</div>
                                <div class="text-xs text-white/60 mt-1">{$LL.chat.poll.create.openDescription()}</div>
                            </button>
                        {/if}
                        {#if supportedKinds.includes("closed")}
                            <button
                                data-testid="createPollVisibilityClosed"
                                class={`rounded-xl border border-white/10 p-3 text-left ${
                                    selectedKind === "closed" ? "bg-white/10 border-white/30" : ""
                                }`}
                                onclick={() => (selectedKind = "closed")}
                            >
                                <div class="font-bold">{$LL.chat.poll.kind.closed()}</div>
                                <div class="text-xs text-white/60 mt-1">{$LL.chat.poll.create.closedDescription()}</div>
                            </button>
                        {/if}
                    </div>
                </div>
            {/if}

            {#if errorMessage}
                <div class="w-full rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorMessage}</div>
            {/if}
        </div>
    {/snippet}

    {#snippet action()}
        <div class="flex w-full gap-3">
            <button class="btn btn-light btn-ghost flex-1 justify-center" onclick={() => modals.close()}>
                {$LL.chat.poll.create.cancel()}
            </button>
            <button
                data-testid="submitCreatePollButton"
                class="btn btn-secondary flex-1 justify-center"
                disabled={!canSubmit}
                onclick={createPoll}
            >
                {#if isSubmitting}
                    <IconLoader class="animate-[spin_2s_linear_infinite] mr-2" font-size={16} />
                {/if}
                {$LL.chat.poll.create.submit()}
            </button>
        </div>
    {/snippet}
</Popup>
