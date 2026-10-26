<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import type { TodoItem } from "./todo";
    import { daysUntil, formatDue, listColor } from "./todo";
    import { IconNotes, IconRepeat } from "@wa-icons";

    interface Props {
        item: TodoItem;
        now: Date;
        /** Off where the section title already says when the task is due. */
        showDue?: boolean;
        /** Inside the "for today" card: the list goes on its own line. */
        prominent?: boolean;
    }

    let { item, now, showDue = true, prominent = false }: Props = $props();

    let task = $derived(item.task);
    let overdue = $derived(task.start !== undefined && daysUntil(task.start, now) < 0);
    // Read-only: the providers only grant reading tasks, so a click shows the note rather than ticking the task off.
    let open = $state(false);
</script>

{#snippet summary()}
    <span class="h-2.5 w-2.5 shrink-0 rounded-full {listColor(item.listIndex)}" aria-hidden="true"></span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate {prominent ? 'text-base font-bold' : 'text-base'}">{task.title}</span>
        <span class="flex min-w-0 items-center gap-1.5 text-xs text-contrast-200">
            <span class="truncate">{item.list.title}</span>
            {#if task.status === "inProgress"}
                <span class="shrink-0 rounded-sm bg-secondary/35 px-1.5 text-white">
                    {$LL.externalModule.todoList.inProgress()}
                </span>
            {/if}
            {#if task.recurence}
                <span class="flex shrink-0 items-center gap-1">
                    <IconRepeat class="h-3.5 w-3.5" aria-hidden="true" />
                    {$LL.externalModule.todoList.recurrence[task.recurence]()}
                </span>
            {/if}
            {#if task.description && !open}
                <IconNotes class="h-3.5 w-3.5 shrink-0" aria-label={$LL.externalModule.todoList.hasNote()} />
            {/if}
        </span>
    </span>
    {#if showDue && task.start}
        <span
            class="shrink-0 whitespace-nowrap text-sm tabular-nums {overdue
                ? 'font-bold text-danger-600'
                : 'text-contrast-200'}"
        >
            {formatDue(task.start, now)}
        </span>
    {/if}
{/snippet}

<div
    class="rounded-md border border-solid {overdue ? 'border-danger-600/60' : 'border-white/10'} {prominent
        ? 'bg-contrast'
        : 'bg-white/5'}"
>
    {#if task.description}
        <button
            type="button"
            class="m-0 flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-3 py-2.5 text-left text-white"
            aria-expanded={open}
            onclick={() => (open = !open)}
        >
            {@render summary()}
        </button>
        {#if open}
            <p class="m-0 whitespace-pre-line break-words px-3 pb-3 ps-8 text-sm text-contrast-100">
                {task.description}
            </p>
        {/if}
    {:else}
        <div class="flex items-center gap-2.5 px-3 py-2.5">
            {@render summary()}
        </div>
    {/if}
</div>
