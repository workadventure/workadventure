<script lang="ts">
    import { fly } from "svelte/transition";
    import { writable, get } from "svelte/store";
    import { onMount } from "svelte";
    import { isTodoListVisibleStore, todoListsStore } from "../../Stores/TodoListStore";
    import LL from "../../../i18n/i18n-svelte";
    import todoListPng from "../images/applications/todolist.png";
    import taskPng from "../images/applications/task.png";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
    import ExternalComponents from "../ExternalModules/ExternalComponents.svelte";
    import TodoTask from "./TodoTask.svelte";
    import { IconChevronRight } from "@wa-icons";

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

    function goToLoginPage() {
        analyticsClient.login();
        window.location.href = "/login";
    }

    onMount(() => {
        if ($todoListsStore.size === 1) {
            openTodoList([...$todoListsStore.values()].at(0)!.id);
        }
    });
</script>

<div class="totolist p-1 @md/actions:p-2 select-text max-h-screen flex">
    <div
        class="sidebar p-2 [&>*]:p-1 max-h-full overflow-y-auto bg-contrast/80 rounded-lg backdrop-blur mobile:w-64 w-96"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
    >
        <div class="mapexplorer flex flex-col overflow-auto">
            <div class="header-container pb-4">
                <div class="flex flex-row items-start justify-between">
                    <div class="flex flex-row items-center gap-2 flex-wrap">
                        {#if get(externalSvelteComponentService.getComponentsByZone("todoListImage")).size > 0}
                            <ExternalComponents zone="todoListImage" />
                        {:else}
                            <img draggable="false" src={todoListPng} class="w-6" alt={$LL.menu.icon.open.todoList()} />
                            <span>/</span>
                            <img draggable="false" src={taskPng} class="w-6" alt={$LL.menu.icon.open.todoList()} />
                        {/if}
                        <h3 class="text-lg text-left py-2">{$LL.externalModule.todoList.title()}</h3>
                        <span class="ml-1 px-1 py-0.5 rounded-sm bg-white text-secondary text-xxs font-bold">Beta</span>
                    </div>

                    <ButtonClose on:click={closeTodoList} />
                </div>
            </div>
            <div class="flex flex-col justify-center gap-4">
                {#if !$userIsConnected}
                    <div class="flex flex-col justify-center items-center">
                        <!--
                        <h4 class="text-l text-left">{$LL.externalModule.teams.userNotConnected()}</h4>
                        <p class="text-xs text-left">{$LL.externalModule.teams.connectToYourTeams()}</p>
                        -->
                        {#if get(externalSvelteComponentService.getComponentsByZone("todoListButton")).size === 0}
                            <button
                                class="btn disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                                on:click={goToLoginPage}
                                >{$LL.menu.profile.login()}
                            </button>
                        {/if}
                    </div>
                {/if}
                {#if get(externalSvelteComponentService.getComponentsByZone("todoListButton")).size > 0}
                    <div class="flex flex-col justify-center items-center content-center">
                        <ExternalComponents zone="todoListButton" />
                    </div>
                {/if}
                {#each [...$todoListsStore.entries()] as [key, todoList] (key)}
                    <div class="flex flex-col gap-2">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="flex justify-between items-center bg-white/10 hover:bg-white/20 p-2 rounded-md cursor-pointer"
                            on:click={() => openTodoList(todoList.id)}
                        >
                            <div class="text-base text-left flex flex-row gap-3 items-center w-full">
                                <h4 class="text-base overflow-hidden text-ellipsis">{todoList.title}</h4>
                                <div
                                    class="bg-white font-bold text-secondary rounded flex- items-center justify-center aspect-square min-w-6"
                                >
                                    <div class="text-center">
                                        {todoList.tasks.filter(
                                            (task) => task.status === "notStarted" || task.status === "inProgress"
                                        ).length}
                                    </div>
                                </div>
                            </div>
                            <IconChevronRight
                                class="{$totoListOpenedId.has(todoList.id) ? 'rotate-90' : ''} transition-all"
                            />
                        </div>
                        <div class="flex flex-col gap-0.5 p-2" class:hidden={!$totoListOpenedId.has(todoList.id)}>
                            {#each todoList.tasks.filter((task) => task.status === "notStarted") as item (item.id)}
                                <TodoTask task={item} />
                            {/each}
                            {#each todoList.tasks.filter((task) => task.status === "inProgress") as item (item.id)}
                                <TodoTask task={item} />
                            {/each}
                            {#if todoTaskCompletedOpened}
                                {#each todoList.tasks.filter((task) => task.status === "completed") as item (item.id)}
                                    <TodoTask task={item} />
                                {/each}
                            {/if}
                            {#if todoList.tasks.filter((task) => task.status === "completed").length > 0}
                                {#if todoTaskCompletedOpened === false}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <span
                                        class="text-sm text-gray-400 italic hover:underline cursor-pointer"
                                        on:click={() => (todoTaskCompletedOpened = true)}
                                    >
                                        See completed task ☕️
                                    </span>
                                {/if}
                                {#if todoTaskCompletedOpened === true}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
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
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            {#if $userIsConnected}
                <p
                    class="text-center text-xs text-gray-400 italic hover:underline cursor-pointer mt-5"
                    on:click={closeTodoList}
                >
                    ${$LL.externalModule.todoList.sentence()}
                </p>
            {/if}
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
        }
    }
</style>
