<script lang="ts">
    import type { ChatPollCreationCapability, ChatPollKind } from "../Connection/ChatConnection";
    import Popup from "../../Components/Modal/Popup.svelte";
    import Input from "../../Components/Input/Input.svelte";
    import TextArea from "../../Components/Input/TextArea.svelte";
    import InputRadioBox from "../../Components/Input/InputRadioBox.svelte";
    import InputGroupLabel from "../../Components/Input/InputGroupLabel.svelte";
    import InputHelperText from "../../Components/Input/InputHelperText.svelte";
    import Button from "../../Components/UI/Button.svelte";
    import Alert from "../../Components/UI/Alert.svelte";
    import { chatInputFocusStore } from "../../Stores/ChatStore";
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

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }

    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }

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

{#snippet submitSpinner()}
    <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={16} />
{/snippet}

<Popup isOpen withAction>
    {#snippet title()}
        <h1 class="text-2xl font-bold">{$LL.chat.poll.create.title()}</h1>
    {/snippet}

    {#snippet content()}
        <div class="w-full flex flex-col gap-4">
            <div class="w-full">
                <TextArea
                    dataTestId="createPollQuestionInput"
                    id="poll-question"
                    label={$LL.chat.poll.create.question()}
                    placeHolder={$LL.chat.poll.create.questionPlaceholder()}
                    bind:value={question}
                    maxlength={limits.questionMaxLength}
                    onfocus={focusChatInput}
                    onblur={unfocusChatInput}
                />
                <InputHelperText align="right">
                    {question.length}/{limits.questionMaxLength}
                </InputHelperText>
            </div>

            <div class="w-full">
                <div class="flex items-center justify-between gap-3">
                    <InputGroupLabel id="poll-answers-label">{$LL.chat.poll.create.answers()}</InputGroupLabel>
                    <Button variant="light" appearance="ghost" size="sm" disabled={!canAddAnswer} onclick={addAnswer}>
                        {#snippet icon()}
                            <IconPlus font-size={16} />
                        {/snippet}
                        {$LL.chat.poll.create.addAnswer()}
                    </Button>
                </div>

                <div class="flex flex-col gap-2" role="group" aria-labelledby="poll-answers-label">
                    {#each answers as answer, index (index)}
                        <div class="flex items-center gap-2">
                            <Input
                                data-testid={`createPollAnswerInput-${index}`}
                                bind:value={answers[index]}
                                maxlength={limits.answerMaxLength}
                                placeholder={$LL.chat.poll.create.answerPlaceholder({ index: index + 1 })}
                                onfocusin={focusChatInput}
                                onfocusout={unfocusChatInput}
                            />
                            <Button
                                variant="light"
                                appearance="ghost"
                                size="sm"
                                square
                                aria-label={$LL.chat.poll.create.removeAnswer({ index: index + 1 })}
                                disabled={answers.length <= limits.minAnswers}
                                onclick={() => removeAnswer(index)}
                            >
                                {#snippet icon()}
                                    <IconTrash font-size={16} />
                                {/snippet}
                            </Button>
                        </div>
                    {/each}
                </div>

                <InputHelperText>
                    {$LL.chat.poll.create.answerCount({ count: normalizedAnswers.length, max: limits.maxAnswers })}
                </InputHelperText>
            </div>

            {#if supportedKinds.length > 1}
                <div class="w-full">
                    <InputGroupLabel id="poll-visibility-label">{$LL.chat.poll.create.visibility()}</InputGroupLabel>
                    <div class="flex gap-2" role="radiogroup" aria-labelledby="poll-visibility-label">
                        {#if supportedKinds.includes("open")}
                            <InputRadioBox
                                dataTestId="createPollVisibilityOpen"
                                value="open"
                                label={$LL.chat.poll.kind.open()}
                                bind:group={selectedKind}
                                outerClass="flex-1"
                            >
                                <span class="text-xs">{$LL.chat.poll.create.openDescription()}</span>
                            </InputRadioBox>
                        {/if}
                        {#if supportedKinds.includes("closed")}
                            <InputRadioBox
                                dataTestId="createPollVisibilityClosed"
                                value="closed"
                                label={$LL.chat.poll.kind.closed()}
                                bind:group={selectedKind}
                                outerClass="flex-1"
                            >
                                <span class="text-xs">{$LL.chat.poll.create.closedDescription()}</span>
                            </InputRadioBox>
                        {/if}
                    </div>
                </div>
            {/if}

            {#if errorMessage}
                <Alert class="w-full">{errorMessage}</Alert>
            {/if}
        </div>
    {/snippet}

    {#snippet action()}
        <div class="flex w-full gap-3">
            <Button variant="light" appearance="ghost" class="flex-1" onclick={() => modals.close()}>
                {$LL.chat.poll.create.cancel()}
            </Button>
            <Button
                variant="secondary"
                class="flex-1"
                dataTestId="submitCreatePollButton"
                icon={isSubmitting ? submitSpinner : undefined}
                disabled={!canSubmit}
                onclick={createPoll}
            >
                {$LL.chat.poll.create.submit()}
            </Button>
        </div>
    {/snippet}
</Popup>
