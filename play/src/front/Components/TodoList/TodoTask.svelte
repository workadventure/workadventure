<script lang="ts">
    import type { TodoTaskInterface } from "@workadventure/shared-utils";
    export let task: TodoTaskInterface;

    export let oddColor: string | boolean = "odd:bg-white/10";
    export let evenColor: string | boolean = "even:bg-white/5";

    let opendDescription = false;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="flex flex-col text-left my-2 p-2 box-border hover:bg-white/15 transition-all {oddColor ?? ''} {evenColor ??
        ''} rounded-md"
    class:cursor-pointer={task.status == "completed"}
    on:click={() => (opendDescription = !opendDescription)}
>
    <p class="text-lg m-0 p-0" class:line-through={task.status === "completed" && !opendDescription}>
        <span class="font-bold">{task.title}</span>
        {#if task.end}<span class="text-sm border border-gray-400 border-solid rounded-lg px-2"
                >{task.end.toLocaleDateString()}</span
            >{/if}
    </p>
    {#if task.status !== "completed"}
        {#if task.description}
            <p class="text-sm m-0 p-0 py-2">Description: {task.description}</p>
        {/if}
        {#if task.start}
            <p class="w-fit text-xs m-0 p-0 border border-gray-400 border-solid rounded-lg px-2">
                Due date: {task.start.toLocaleDateString()}
            </p>
        {/if}
        {#if task.end}
            <p class="w-fit text-xs m-0 p-0 border border-gray-400 border-solid rounded-lg px-2">
                Complete: {task.end.toLocaleDateString()}
            </p>
        {/if}
        {#if task.recurence}
            <p class="w-fit text-xs m-0 p-0 border border-gray-400 border-solid rounded-lg px-2">
                Repeat: {task.recurence}
            </p>
        {/if}
    {:else if task.description && opendDescription}
        <p class="text-sm m-0 p-0 py-2">Description: {task.description}</p>
    {/if}
</div>
