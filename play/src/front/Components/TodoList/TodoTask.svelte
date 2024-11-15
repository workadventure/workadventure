<script lang="ts">
    import { TodoTaskInterface } from "@workadventure/shared-utils";
    export let task: TodoTaskInterface;
</script>

<div class="tw-flex tw-flex-col tw-text-left tw-p-2 hover:tw-border-white hover:tw-border hover:tw-border-solid">
    <p class="tw-text-lg tw-m-0 tw-p-0" class:tw-line-through={task.status === "completed"}>
        {task.title}
        {#if task.end}<span class="tw-text-sm">({task.end.toLocaleDateString()})</span>{/if}
    </p>
    {#if task.status !== "completed"}
        {#if task.description}
            <p class="tw-text-sm tw-m-0 tw-p-0 tw-py-1">Description: {task.description}</p>
        {/if}
        {#if task.start}
            <p class="tw-text-xs tw-m-0 tw-p-0">Due date: {task.start.toLocaleDateString()}</p>
        {/if}
        {#if task.end}
            <p class="tw-text-xs tw-m-0 tw-p-0">Complete: {task.end.toLocaleDateString()}</p>
        {/if}
        {#if task.recurence}
            <p class="tw-text-xs tw-m-0 tw-p-0">Repeat: {task.recurence}</p>
        {/if}
    {/if}
</div>
