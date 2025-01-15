<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import type { ActionsMenuAction, ActionsMenuData } from "../../Stores/ActionsMenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import bgMap from "../images/map-exemple.png";

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
    <div
        class="absolute left-0 right-0 m-auto w-96 z-50 bg-contrast/80 transition-all backdrop-blur rounded-lg overflow-hidden pointer-events-auto overflow-hidden top-1/2 -translate-y-1/2"
    >
        {#if actionsMenuData.menuName}
            <div class="mb-4">
                <div class="h-32 w-full bg-cover relative mb-8" style="background-image: url('{bgMap}');">
                    <div class="w-full h-full absolute z-10 bg-contrast/50 left-0 right-0" />
                    <div class="h-20 w-20 aspect-ratio bg-white rounded absolute -bottom-4 left-4 z-20" />
                    <div class="px-4 flex items-center bottom-2 absolute z-20">
                        <div class="h5 text-white ml-20 pl-4">
                            {actionsMenuData.menuName}
                        </div>
                        <div>
                            <div class="chip chip-sm chip-danger ml-2">Administrator</div>
                        </div>
                    </div>
                </div>
                {#if actionsMenuData.menuDescription}
                    <p class="text-sm opacity-50 text-white px-4">
                        {actionsMenuData.menuDescription}
                    </p>
                {/if}
            </div>
        {/if}
        <div class="flex flex-col-reverse items-center bg-contrast" class:margin-close={!actionsMenuData.menuName}>
            <button
                type="button"
                class="btn btn-ghost justify-center basis-1/2 m-2 w-full"
                on:click|preventDefault|stopPropagation={closeActionsMenu}
            >
                {$LL.actionbar.close()}
            </button>
            {#if sortedActions}
                {#each sortedActions ?? [] as action (action.actionName)}
                    <button
                        type="button"
                        class="btn btn-danger justify-center basis-1/2 m-2 w-full {action.style ?? ''}"
                        on:click={analyticsClient.clicPropertykMapEditor(action.actionName, action.style)}
                        on:click|preventDefault={() => {
                            action.callback();
                        }}
                    >
                        {action.actionName}
                    </button>
                {/each}
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
</style>
