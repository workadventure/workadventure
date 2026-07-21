<script lang="ts">
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import type { ChatQuestionItem } from "../../Connection/ChatConnection";
    import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
    import Button from "../../../Components/UI/Button.svelte";
    import Chip from "../../../Components/UI/Chip.svelte";
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
        class="question-card rounded-2xl bg-contrast/90 border border-solid border-white/10 p-4 max-w-2xl"
    >
        <div class="flex flex-wrap items-center gap-2">
            <Chip variant="warning" size="xs">
                <IconHelpCircle font-size={12} class="mr-1" />
                {$LL.chat.question.badge()}
            </Chip>
            {#if $questionState.isAnswered}
                <span data-testid="questionAnsweredBadge">
                    <Chip variant="success" size="xs">{$LL.chat.question.answered()}</Chip>
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
            <Button
                variant={$questionState.hasUpvoted ? "primary" : "light"}
                appearance={$questionState.hasUpvoted ? "filled" : "border"}
                size="xs"
                disabled={!$questionState.canUpvote || isUpvoting}
                aria-label={$LL.chat.question.upvote()}
                aria-pressed={$questionState.hasUpvoted}
                dataTestId="questionUpvoteButton"
                onclick={toggleUpvote}
            >
                {#snippet icon()}
                    <span aria-hidden="true">👍</span>
                {/snippet}
                <span data-testid="questionUpvoteCount">{$questionState.upvoteCount}</span>
            </Button>

            {#if $questionState.canMarkAnswered}
                <Button
                    variant="success"
                    appearance="border"
                    size="xs"
                    disabled={isMarkingAnswered}
                    dataTestId="questionMarkAnsweredButton"
                    onclick={markAnswered}
                >
                    {#snippet icon()}
                        {#if isMarkingAnswered}
                            <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                        {:else}
                            <IconCheck font-size={14} />
                        {/if}
                    {/snippet}
                    {$LL.chat.question.markAnswered()}
                </Button>
            {/if}

            {#if $questionState.canDelete}
                <Button
                    variant="danger"
                    appearance="border"
                    size="xs"
                    disabled={isDeleting}
                    dataTestId="questionDeleteButton"
                    onclick={removeQuestion}
                >
                    {#snippet icon()}
                        {#if isDeleting}
                            <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                        {:else}
                            <IconTrash font-size={14} />
                        {/if}
                    {/snippet}
                    {$LL.chat.delete()}
                </Button>
            {/if}

            <Button
                variant="light"
                appearance="ghost"
                size="xs"
                class="ms-auto"
                dataTestId="questionViewAllButton"
                onclick={openQuestionsPanel}
            >
                {#snippet icon()}
                    <IconList font-size={14} />
                {/snippet}
                {$LL.chat.question.viewAll()}
            </Button>
        </div>
    </div>
</div>

<style>
    .overflow-wrap-anywhere {
        overflow-wrap: anywhere;
    }
</style>
