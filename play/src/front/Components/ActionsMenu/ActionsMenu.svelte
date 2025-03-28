<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import VisitCard from "../VisitCard/VisitCard.svelte";

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
            console.log(sortedActions);
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
    <div
        class="absolute left-0 right-0 m-auto max-w-md z-50 bg-contrast/80 transition-all backdrop-blur rounded-lg pointer-events-auto overflow-hidden top-1/2 -translate-y-1/2"
        data-testid="actions-menu"
    >
        {#if actionsMenuData.menuName}
            <div>
                <div class="w-full bg-cover relative">
                    <div class="flex items-end justify-between p-2">
                        <div class="text-white font-bold text-xl pl-3">
                            {actionsMenuData.menuName}
                        </div>
                        <ButtonClose on:click={closeActionsMenu} />
                    </div>
                    {#if actionsMenuData.visitCardUrl}
                        <VisitCard
                            visitCardUrl={actionsMenuData.visitCardUrl}
                            isEmbedded={true}
                            showSendMessageButton={false}
                        />
                    {/if}
                </div>
                {#if actionsMenuData.menuDescription}
                    <p class="text-sm opacity-50 text-white px-4">
                        {actionsMenuData.menuDescription}
                    </p>
                {/if}
            </div>
        {/if}

        <div class="flex flex-row items-center bg-contrast" class:margin-close={!actionsMenuData.menuName}>
            {#if sortedActions}
                {#each sortedActions ?? [] as action (action.actionName)}
                    <button
                        type="button"
                        class="btn text-nowrap justify-center m-2 w-full {action.style ?? ''}"
                        on:click={analyticsClient.clicPropertykMapEditor(action.actionName, action.style)}
                        on:click|preventDefault={() => {
                            action.callback();
                        }}
                    >
                        <span class="flex flex-row gap-2 items-center justify-center">
                            {#if action.actionIcon}
                                <div
                                    class="w-6 h-6"
                                    style="background-color: {action.iconColor ?? 'white'};
                                -webkit-mask: url({action.actionIcon}) no-repeat center;
                                    mask: url({action.actionIcon}) no-repeat center;"
                                />
                            {/if}
                            {action.actionName}
                        </span>
                    </button>
                {/each}
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
</style>
