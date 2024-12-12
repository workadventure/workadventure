<script lang="ts">
    import { fly } from "svelte/transition";
    import { writable } from "svelte/store";
    import { isTodoListVisibleStore, todoListsStore } from "../../Stores/TodoListStore";
    import LL from "../../../i18n/i18n-svelte";
    import todoListPng from "../images/applications/todolist.png";
    import TodoTask from "./TodoTask.svelte";
    import { IconArrowDown } from "@wa-icons";

    let todoTaskCompletedOpened = false;
    let totoListOpenedId = writable<Set<string>>(new Set());

    function closeTodoList() {
        isTodoListVisibleStore.set(false);
    }

    function openTodoList(id: string) {
        todoTaskCompletedOpened = false;
        if ($totoListOpenedId.has(id)) {
            $totoListOpenedId.delete(id);
        } else {
            $totoListOpenedId.add(id);
        }
        totoListOpenedId.set(new Set($totoListOpenedId));
    }
</script>

<div class="totolist bg-dark-blue/95 select-text">
    <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
        <button class="close-window" data-testid="mapEditor-close-button" on:click={closeTodoList}>&#215;</button>

        <div class="mapexplorer flex flex-col overflow-auto">
            <div class="header-container">
                <h3 class="text-l text-left">
                    <img draggable="false" src={todoListPng} class="w-8 mx-2" alt={$LL.menu.icon.open.todoList()} />
                    To Do 📋 (beta)
                </h3>
            </div>
            <div class="flex flex-col justify-center gap-4">
                {#each [...$todoListsStore.entries()] as [key, todoList] (key)}
                    <div class="flex flex-col gap-2">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="flex justify-between items-center bg-dark-purple/80 hover:bg-dark-purple/100 p-2 rounded-md cursor-pointer"
                            on:click={() => openTodoList(todoList.id)}
                        >
                            <h4 class="text-l text-left">
                                {todoList.title} ({todoList.tasks.filter(
                                    (task) => task.status === "notStarted" || task.status === "inProgress"
                                ).length})
                            </h4>
                            {#if $totoListOpenedId.has(todoList.id)}
                                <IconArrowDown />
                            {:else}
                                <IconArrowDown class="transform rotate-180" />
                            {/if}
                        </div>
                        <div class="flex flex-col gap-4 p-2" class:hidden={!$totoListOpenedId.has(todoList.id)}>
                            {#each todoList.tasks.filter((task) => task.status === "notStarted") as item (item.id)}
                                <TodoTask task={item} />
                            {/each}
                            {#each todoList.tasks.filter((task) => task.status === "inProgress") as item (item.id)}
                                <TodoTask task={item} />
                            {/each}
                            {#if todoList.tasks.filter((task) => task.status === "completed").length > 0}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                {#if todoTaskCompletedOpened === false}
                                    <span
                                        class="text-sm text-gray-400 italic hover:underline cursor-pointer"
                                        on:click={() => (todoTaskCompletedOpened = true)}
                                    >
                                        See completed task ☕️
                                    </span>
                                {/if}
                                <div class="flex flex-col gap-4" class:hidden={!todoTaskCompletedOpened}>
                                    {#each todoList.tasks.filter((task) => task.status === "completed") as item (item.id)}
                                        <TodoTask task={item} />
                                    {/each}
                                </div>
                                {#if todoTaskCompletedOpened === true}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span
                                        class="text-sm text-gray-400 italic hover:underline cursor-pointer"
                                        on:click={() => (todoTaskCompletedOpened = false)}
                                    >
                                        Hide completed task ☕️
                                    </span>
                                {/if}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <p
                class="text-center text-xs text-gray-400 italic hover:underline cursor-pointer mt-5"
                on:click={closeTodoList}
            >
                Take a break 🙏 maybe have a coffee or tea? ☕
            </p>
        </div>
    </div>
</div>

<style lang="scss">
    .totolist {
        position: absolute !important;
        top: 0;
        right: 0;
        width: fit-content !important;
        z-index: 425;

        pointer-events: auto;
        color: whitesmoke;

        button.close-window {
            right: 0.5rem;
        }

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 1.5em;
            width: 23em !important;
        }
    }
</style>
