<script lang="ts">
    import { closeModal } from "svelte-modals";
    import type { ChatPollCreationCapability, ChatPollKind } from "../Connection/ChatConnection";
    import Popup from "../../Components/Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { IconLoader, IconPlus, IconTrash } from "@wa-icons";

    export let pollCreation: ChatPollCreationCapability;

    const limits = pollCreation.limits;
    const canCreatePoll = pollCreation.canCreate;
    const supportedKinds = pollCreation.supportedKinds;

    let question = "";
    let selectedKind: ChatPollKind = supportedKinds[0] ?? "open";
    let answers = Array.from({ length: limits.minAnswers }, () => "");
    let errorMessage: string | undefined;
    let isSubmitting = false;

    $: normalizedAnswers = answers.map((answer) => answer.trim()).filter((answer) => answer.length > 0);
    $: canAddAnswer = answers.length < limits.maxAnswers;
    $: hasInvalidAnswerLength = answers.some((answer) => answer.length > limits.answerMaxLength);
    $: canSubmit =
        $canCreatePoll &&
        supportedKinds.length > 0 &&
        question.trim().length > 0 &&
        question.length <= limits.questionMaxLength &&
        normalizedAnswers.length >= limits.minAnswers &&
        !hasInvalidAnswerLength &&
        !isSubmitting;

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
            closeModal();
        } catch (error) {
            console.error("Failed to create poll", error);
            errorMessage = $LL.chat.poll.create.submitError();
        } finally {
            isSubmitting = false;
        }
    }
</script>

<Popup isOpen withAction>
    <h1 slot="title" class="text-2xl font-bold">{$LL.chat.poll.create.title()}</h1>

    <div slot="content" class="w-full flex flex-col gap-4">
        <div class="w-full">
            <label class="text-sm font-bold mb-2 block" for="poll-question">{$LL.chat.poll.create.question()}</label>
            <textarea
                data-testid="createPollQuestionInput"
                id="poll-question"
                bind:value={question}
                rows={3}
                maxlength={limits.questionMaxLength}
                class="wa-searchbar block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 resize-none outline-none shadow-none focus:ring-0 focus:border-white/20"
                placeholder={$LL.chat.poll.create.questionPlaceholder()}
            />
            <div class="mt-1 text-xs text-white/50 text-right">{question.length}/{limits.questionMaxLength}</div>
        </div>

        <div class="w-full">
            <div class="flex items-center justify-between gap-3 mb-2">
                <div class="text-sm font-bold block">{$LL.chat.poll.create.answers()}</div>
                <button class="btn btn-light btn-ghost btn-sm" disabled={!canAddAnswer} on:click={addAnswer}>
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
                            on:click={() => removeAnswer(index)}
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
                            on:click={() => (selectedKind = "open")}
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
                            on:click={() => (selectedKind = "closed")}
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

    <div slot="action" class="flex w-full gap-3">
        <button class="btn btn-light btn-ghost flex-1 justify-center" on:click={closeModal}>
            {$LL.chat.poll.create.cancel()}
        </button>
        <button
            data-testid="submitCreatePollButton"
            class="btn btn-secondary flex-1 justify-center"
            disabled={!canSubmit}
            on:click={createPoll}
        >
            {#if isSubmitting}
                <IconLoader class="animate-[spin_2s_linear_infinite] mr-2" font-size={16} />
            {/if}
            {$LL.chat.poll.create.submit()}
        </button>
    </div>
</Popup>
