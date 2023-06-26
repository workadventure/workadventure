<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";

    import type { ActionsMenuAction, ActionsMenuData } from "../../Stores/ActionsMenuStore";

    let actionsMenuData: ActionsMenuData | undefined;
    let sortedActions: ActionsMenuAction[] | undefined;

    let actionsMenuStoreUnsubscriber: Unsubscriber | null;

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeActionsMenu();
        }
    }

    function closeActionsMenu() {
        actionsMenuStore.clear();
    }

    actionsMenuStoreUnsubscriber = actionsMenuStore.subscribe((value) => {
        actionsMenuData = value;
        if (actionsMenuData) {
            sortedActions = [...actionsMenuData.actions.values()].sort((a, b) => {
                const ap = a.priority ?? 0;
                const bp = b.priority ?? 0;
                if (ap > bp) {
                    return -1;
                }
                if (ap < bp) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    });

    onDestroy(() => {
        if (actionsMenuStoreUnsubscriber) {
            actionsMenuStoreUnsubscriber();
        }
    });
</script>

<svelte:window on:keydown={onKeyDown} />

{#if actionsMenuData}
    <div class="actions-menu is-rounded">
        <button type="button" class="close-window" on:click={closeActionsMenu}>×</button>
        {#if actionsMenuData.menuName}
            <h2 class="name">{actionsMenuData.menuName}</h2>
        {/if}
        {#if sortedActions}
            <div class="actions tw-flex tw-justify-center tw-flex-col tw-items-center">
                {#each sortedActions ?? [] as action}
                    <button
                        type="button"
                        class="btn light tw-justify-center tw-font-bold tw-text-xs sm:tw-text-base tw-text-center tw-m-2 {action.style ??
                            ''}"
                        on:click|preventDefault={() => {
                            action.callback();
                        }}
                    >
                        {action.actionName}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
    .actions-menu {
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
        width: 260px !important;
        height: max-content !important;
        max-height: 50vh;
        margin-top: 200px;
        z-index: 425;

        pointer-events: auto;
        color: whitesmoke;
        border-radius: 0.25rem;
        background-color: rgb(27 27 41 / 0.95);

        .close-window {
            right: 0rem;
            top: 0rem;
        }

        .actions {
            max-height: 30vh;
            width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 25px;
            button {
                width: fit-content;
            }
        }

        .name {
            max-height: 15vh;
            margin: 20px 20px 0 20px;
        }

        .actions::-webkit-scrollbar {
            display: none;
        }

        h2 {
            text-align: center;
            margin: 20px;
        }

        .nes-btn.is-error.close {
            position: absolute;
            top: -20px;
            right: -20px;
        }
    }
</style>
