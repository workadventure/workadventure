<script lang="ts">
    import { TodoTaskInterface } from "@workadventure/shared-utils";
    export let task: TodoTaskInterface;

    export let oddColor: string | boolean = "odd:bg-white/10";
    export let evenColor: string | boolean = "even:bg-white/5";
</script>

<div
    class="flex flex-col text-left p-2 box-border hover:bg-white/15 transition-all {oddColor ?? ''} {evenColor ??
        ''} first:rounded-t-md last:rounded-b-md"
>
    <p class="text-lg m-0 p-0" class:line-through={task.status === "completed"}>
        {task.title}
        {#if task.end}<span class="text-sm">({task.end.toLocaleDateString()})</span>{/if}
    </p>
    {#if task.status !== "completed"}
        {#if task.description}
            <p class="text-sm m-0 p-0 py-1">Description: {task.description}</p>
        {/if}
        {#if task.start}
            <p class="text-xs m-0 p-0">Due date: {task.start.toLocaleDateString()}</p>
        {/if}
        {#if task.end}
            <p class="text-xs m-0 p-0">Complete: {task.end.toLocaleDateString()}</p>
        {/if}
        {#if task.recurence}
            <p class="text-xs m-0 p-0">Repeat: {task.recurence}</p>
        {/if}
    {/if}
</div>
