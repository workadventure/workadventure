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

<div class="calendar tw-bg-dark-blue/95">
    <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
        <button class="close-window" data-testid="mapEditor-close-button" on:click={closeTodoList}>&#215;</button>

        <div class="mapexplorer tw-flex tw-flex-col tw-overflow-auto">
            <div class="header-container">
                <h3 class="tw-text-l tw-text-left">
                    <img
                        draggable="false"
                        src={todoListPng}
                        class="tw-w-8 tw-mx-2"
                        alt={$LL.menu.icon.open.todoList()}
                    />
                    To Do 📋 (beta)
                </h3>
            </div>
            <div class="tw-flex tw-flex-col tw-justify-center tw-gap-4">
                {#each [...$todoListsStore.entries()] as [key, todoList] (key)}
                    <div class="tw-flex tw-flex-col tw-gap-2">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="tw-flex tw-justify-between tw-items-center tw-bg-dark-purple/80 hover:tw-bg-dark-purple/100 tw-p-2 tw-rounded-md tw-cursor-pointer"
                            on:click={() => openTodoList(todoList.id)}
                        >
                            <h4 class="tw-text-l tw-text-left">
                                {todoList.title} ({todoList.tasks.filter(
                                    (task) => task.status === "notStarted" || task.status === "inProgress"
                                ).length})
                            </h4>
                            {#if $totoListOpenedId.has(todoList.id)}
                                <IconArrowDown />
                            {:else}
                                <IconArrowDown class="tw-transform tw-rotate-180" />
                            {/if}
                        </div>
                        <div
                            class="tw-flex tw-flex-col tw-gap-4 tw-p-2"
                            class:tw-hidden={!$totoListOpenedId.has(todoList.id)}
                        >
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
                                        class="tw-text-sm tw-text-gray-400 tw-italic hover:tw-underline tw-cursor-pointer"
                                        on:click={() => (todoTaskCompletedOpened = true)}
                                    >
                                        See completed task ☕️
                                    </span>
                                {/if}
                                <div class="tw-flex tw-flex-col tw-gap-4" class:tw-hidden={!todoTaskCompletedOpened}>
                                    {#each todoList.tasks.filter((task) => task.status === "completed") as item (item.id)}
                                        <TodoTask task={item} />
                                    {/each}
                                </div>
                                {#if todoTaskCompletedOpened === true}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span
                                        class="tw-text-sm tw-text-gray-400 tw-italic hover:tw-underline tw-cursor-pointer"
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
                class="tw-text-center tw-text-xs tw-text-gray-400 tw-italic hover:tw-underline tw-cursor-pointer tw-mt-5"
                on:click={closeTodoList}
            >
                Take a break 🙏 maybe have a coffee or tea? ☕
            </p>
        </div>
    </div>
</div>

<style lang="scss">
    .calendar {
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
