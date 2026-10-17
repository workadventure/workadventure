<script lang="ts">
    import { fly } from "svelte/transition";
    import { get } from "svelte/store";
    import type { TodoListInterface } from "@workadventure/shared-utils";
    import { isTodoListVisibleStore, todoListsStore } from "../../Stores/TodoListStore";
    import LL from "../../../i18n/i18n-svelte";
    import todoListPng from "../images/applications/todolist.png";
    import taskPng from "../images/applications/task.png";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Button from "../UI/Button.svelte";
    import Badge from "../UI/Badge.svelte";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { blocker } from "../../Utils/screenBlocker";
    import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
    import ExternalComponents from "../ExternalModules/ExternalComponents.svelte";
    import { startOfDay } from "../Calendar/agenda";
    import type { DueGroup } from "./todo";
    import { buildTodo, daysUntil, formatDue, listColor } from "./todo";
    import TodoTask from "./TodoTask.svelte";
    import { IconCheck, IconChevronRight } from "@wa-icons";

    // Due dates are days: checking every minute is plenty to move on at midnight.
    let now = $state(new Date());
    $effect(() => {
        const interval = setInterval(() => (now = new Date()), 60_000);
        return () => clearInterval(interval);
    });

    /** The list the user filtered on, none for all of them. */
    let listId: string | undefined = $state(undefined);
    let showDone = $state(false);

    let lists = $derived([...$todoListsStore.values()]);
    let todo = $derived(buildTodo(lists, now, listId));
    let overdueCount = $derived(
        todo.focus.filter((item) => item.task.start && daysUntil(item.task.start, now) < 0).length,
    );

    function toDoCount(list: TodoListInterface): number {
        return list.tasks.filter((task) => task.status !== "completed").length;
    }
    let allToDoCount = $derived(lists.reduce((sum, list) => sum + toDoCount(list), 0));

    function sectionTitle(group: DueGroup): string {
        switch (group) {
            case "tomorrow":
                // Mid-morning tomorrow: clear of the clocks changing overnight.
                return formatDue(new Date(startOfDay(now).getTime() + 34 * 60 * 60 * 1000), now);
            case "nextSevenDays":
                return $LL.externalModule.todoList.nextSevenDays();
            case "later":
                return $LL.externalModule.todoList.later();
            default:
                return $LL.externalModule.todoList.noDueDate();
        }
    }

    function closeTodoList() {
        isTodoListVisibleStore.set(false);
    }

    function goToLoginPage() {
        analyticsClient.trackAdminEvent("auth.login_clicked");
        window.location.href = "/login";
    }
</script>

<div class="todolist select-text flex">
    <div
        class="sidebar p-3 h-full bg-contrast/80 backdrop-blur w-96 max-md:w-screen"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
        {@attach blocker}
    >
        <header class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col gap-1">
                <div class="flex flex-row flex-wrap items-center gap-2">
                    {#if get(externalSvelteComponentService.getComponentsByZone("todoListImage")).size > 0}
                        <ExternalComponents zone="todoListImage" />
                    {:else}
                        <img draggable="false" src={todoListPng} class="w-6" alt={$LL.menu.icon.open.todoList()} />
                        <span>/</span>
                        <img draggable="false" src={taskPng} class="w-6" alt={$LL.menu.icon.open.todoList()} />
                    {/if}
                    <h3 class="m-0 text-lg normal-case leading-none">{$LL.externalModule.todoList.title()}</h3>
                    <span class="rounded-sm bg-white px-1 py-0.5 text-xxs font-bold text-secondary">Beta</span>
                </div>
                <span class="text-sm text-contrast-200">
                    {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                </span>
            </div>
            <ButtonClose onclick={closeTodoList} />
        </header>

        {#if !$userIsConnected && get(externalSvelteComponentService.getComponentsByZone("todoListButton")).size == 0}
            <Button variant="secondary" onclick={goToLoginPage}>{$LL.menu.profile.login()}</Button>
        {/if}
        {#if get(externalSvelteComponentService.getComponentsByZone("todoListButton")).size > 0}
            <div class="flex flex-col items-center justify-center">
                <ExternalComponents zone="todoListButton" />
            </div>
        {/if}

        {#if lists.length > 0}
            <div class="-mx-1 flex min-h-0 flex-col gap-3 overflow-y-auto px-1">
                {#if todo.focus.length > 0}
                    <section
                        aria-label={$LL.externalModule.todoList.forToday()}
                        class="flex flex-col gap-2 rounded-lg bg-contrast-600 p-3"
                    >
                        <div class="flex flex-wrap items-center gap-2">
                            <h4 class="m-0 me-auto font-title text-lg font-medium normal-case leading-tight">
                                {$LL.externalModule.todoList.forToday()}
                            </h4>
                            {#if overdueCount > 0}
                                <span class="rounded-sm bg-danger-600/20 px-2 py-0.5 text-xs font-bold text-danger-600">
                                    {$LL.externalModule.todoList.overdueCount({ count: overdueCount })}
                                </span>
                            {/if}
                            {#if todo.focus.length > overdueCount}
                                <span class="rounded-sm bg-secondary px-2 py-0.5 text-xs text-white">
                                    {$LL.externalModule.todoList.todayCount({
                                        count: todo.focus.length - overdueCount,
                                    })}
                                </span>
                            {/if}
                        </div>
                        {#each todo.focus as item (item.task.id)}
                            <TodoTask {item} {now} prominent />
                        {/each}
                    </section>
                {/if}

                {#if lists.length > 1}
                    <nav aria-label={$LL.externalModule.todoList.lists()} class="flex shrink-0 flex-wrap gap-1.5">
                        <Button
                            variant="light"
                            appearance={listId === undefined ? "filled" : "border"}
                            size="xs"
                            class="m-0"
                            aria-pressed={listId === undefined}
                            onclick={() => (listId = undefined)}
                        >
                            {$LL.externalModule.todoList.allLists()}
                            {#snippet notification()}
                                <Badge variant="secondary" size="xs">{allToDoCount}</Badge>
                            {/snippet}
                        </Button>
                        {#each lists as list, index (list.id)}
                            <Button
                                variant="light"
                                appearance={listId === list.id ? "filled" : "border"}
                                size="xs"
                                class="m-0"
                                aria-pressed={listId === list.id}
                                onclick={() => (listId = list.id)}
                            >
                                <span class="me-1.5 inline-block h-2 w-2 rounded-full {listColor(index)}"></span>
                                {list.title}
                                {#snippet notification()}
                                    <Badge variant="secondary" size="xs">{toDoCount(list)}</Badge>
                                {/snippet}
                            </Button>
                        {/each}
                    </nav>
                {/if}

                {#each todo.sections as section (section.group)}
                    <section class="flex flex-col gap-1.5">
                        <div
                            class="flex items-baseline justify-between gap-2 border-0 border-b border-solid border-white/10 py-2"
                        >
                            <h4 class="m-0 font-title text-lg font-medium normal-case">
                                {sectionTitle(section.group)}
                            </h4>
                            <span class="whitespace-nowrap text-sm text-contrast-200">
                                {$LL.externalModule.todoList.taskCount({ count: section.items.length })}
                            </span>
                        </div>
                        {#each section.items as item (item.task.id)}
                            <TodoTask
                                {item}
                                {now}
                                showDue={section.group === "nextSevenDays" || section.group === "later"}
                            />
                        {/each}
                    </section>
                {/each}

                {#if todo.focus.length === 0 && todo.sections.length === 0}
                    <p class="m-0 text-sm text-contrast-200">{$LL.externalModule.todoList.noTasks()}</p>
                {/if}

                {#if todo.done.length > 0}
                    <div class="flex flex-col gap-1">
                        <button
                            type="button"
                            class="m-0 flex h-10 cursor-pointer items-center gap-2 border-0 bg-transparent px-1 text-sm text-contrast-200"
                            aria-expanded={showDone}
                            onclick={() => (showDone = !showDone)}
                        >
                            <IconChevronRight
                                class="h-4 w-4 transition-transform {showDone ? 'rotate-90' : ''}"
                                aria-hidden="true"
                            />
                            {$LL.externalModule.todoList.completedCount({ count: todo.done.length })}
                        </button>
                        {#if showDone}
                            {#each todo.done as item (item.task.id)}
                                <div class="flex items-center gap-2.5 px-3 py-1.5 text-sm text-contrast-200">
                                    <IconCheck class="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                                    <span class="min-w-0 flex-1 truncate">{item.task.title}</span>
                                    {#if item.task.end}
                                        <span class="shrink-0 text-xs">{formatDue(item.task.end, now)}</span>
                                    {/if}
                                </div>
                            {/each}
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .todolist {
        position: absolute !important;
        top: 0;
        bottom: 0;
        right: var(--side-panel-end, 0);
        width: fit-content !important;
        z-index: 425;

        pointer-events: auto;
        color: whitesmoke;

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
    }
</style>
