<script lang="ts">
    import LL, { locale } from "../../../../i18n/i18n-svelte";
    import type { ChatQuestionItem } from "../../Connection/ChatConnection";
    import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
    import Button from "../../../Components/UI/Button.svelte";
    import { IconCheck, IconHelpCircle, IconList, IconLoader, IconThumbUp, IconTrash } from "@wa-icons";

    type PendingAction = "upvote" | "answer" | "delete";

    interface Props {
        question: ChatQuestionItem;
    }

    let { question }: Props = $props();

    let questionState = $derived(question.state);
    let pending: PendingAction | undefined = $state();

    function run(action: PendingAction, request: () => Promise<void>) {
        if (pending) {
            return;
        }

        pending = action;
        request()
            .catch((error) => console.error(`Failed to ${action} question`, error))
            .finally(() => {
                pending = undefined;
            });
    }
</script>

<div class="px-3">
    <div
        data-testid="questionCard"
        class="question-card rounded-2xl bg-contrast/90 border border-solid p-4 max-w-2xl transition-colors {$questionState.isAnswered
            ? 'border-success/30'
            : 'border-white/10'}"
    >
        <div class="flex flex-wrap items-center gap-2">
            <span
                class="inline-flex h-6 items-center gap-1 rounded-md bg-warning/15 px-2 text-xs font-medium text-warning"
            >
                <IconHelpCircle font-size={12} />
                {$LL.chat.question.badge()}
            </span>
            {#if $questionState.isAnswered}
                <span
                    data-testid="questionAnsweredBadge"
                    class="ms-auto inline-flex h-6 items-center gap-1 rounded-md bg-success/15 px-2 text-xs font-medium text-success"
                >
                    <IconCheck font-size={12} />
                    {$LL.chat.question.answered()}
                </span>
            {/if}
        </div>

        <div class="mt-2 whitespace-pre-wrap wrap-anywhere text-sm font-semibold text-white">
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
                disabled={!$questionState.canUpvote || pending === "upvote"}
                aria-label={$LL.chat.question.upvote()}
                aria-pressed={$questionState.hasUpvoted}
                dataTestId="questionUpvoteButton"
                onclick={() => run("upvote", () => question.toggleUpvote())}
            >
                {#snippet icon()}
                    <IconThumbUp font-size={14} />
                {/snippet}
                <span data-testid="questionUpvoteCount">{$questionState.upvoteCount}</span>
            </Button>

            {#if $questionState.canMarkAnswered}
                <Button
                    variant="success"
                    appearance="border"
                    size="xs"
                    disabled={pending === "answer"}
                    dataTestId="questionMarkAnsweredButton"
                    onclick={() => run("answer", () => question.markAnswered())}
                >
                    {#snippet icon()}
                        {#if pending === "answer"}
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
                    disabled={pending === "delete"}
                    dataTestId="questionDeleteButton"
                    onclick={() => run("delete", () => question.remove())}
                >
                    {#snippet icon()}
                        {#if pending === "delete"}
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
                onclick={() => roomSidePanelStore.setActiveSection("questions")}
            >
                {#snippet icon()}
                    <IconList font-size={14} />
                {/snippet}
                {$LL.chat.question.viewAll()}
            </Button>
        </div>
    </div>
</div>
