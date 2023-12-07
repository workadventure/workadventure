<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";

    import type { ActionsMenuAction, ActionsMenuData } from "../../Stores/ActionsMenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

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
    <div class="tw-flex tw-w-full tw-h-full tw-justify-center tw-items-center">
        <div class="actions-menu tw-p-4 is-rounded tw-max-w-xs">
            <button type="button" class="close-window" on:click={closeActionsMenu}>×</button>
            {#if actionsMenuData.menuName}
                <h2 class="name tw-mb-2 tw-mx-2 margin-close">{actionsMenuData.menuName}</h2>
            {/if}
            {#if sortedActions}
                <div
                    class="actions tw-flex tw tw-flex-col tw-items-center"
                    class:margin-close={!actionsMenuData.menuName}
                >
                    {#each sortedActions ?? [] as action (action.actionName)}
                        <button
                            type="button"
                            class="btn light tw-justify-center tw-font-bold tw-text-xs sm:tw-text-base tw-text-center tw-h-fit tw-m-2 tw-w-full {action.style ??
                                ''}"
                            on:click={analyticsClient.clicPropertykMapEditor(action.actionName, action.style)}
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
    </div>
{/if}

<style lang="scss">
    .actions-menu {
        position: relative;
        width: auto !important;
        height: max-content !important;
        max-height: 50vh;
        margin-top: 200px;
        overflow-y: auto;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        border-radius: 0.25rem;
        background-color: rgb(27 27 41 / 0.95);

        .close-window {
            position: absolute;
            right: 0rem;
            top: 0rem;
            margin-top: 0.3rem;
            margin-right: 0.2rem;
        }

        .margin-close {
            margin-top: 15px;
        }

        .actions {
            max-height: 30vh;
            width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
        }

        .name {
            max-height: 25vh;
            margin: 20px 20px 0 20px;
            overflow-y: auto;
        }

        .actions::-webkit-scrollbar {
            display: none;
        }

        h2 {
            text-align: center;
        }

        .nes-btn.is-error.close {
            position: absolute;
            top: -20px;
            right: -20px;
        }
    }
</style>
