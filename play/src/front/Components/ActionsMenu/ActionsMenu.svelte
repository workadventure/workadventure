<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import type { ActionsMenuAction, ActionsMenuData } from "../../Stores/ActionsMenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import ProfilIcon from "../Icons/ProfilIcon.svelte";
    import WokaFromUserId from "../Woka/WokaFromUserId.svelte";

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
        console.log(actionsMenuData);
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
        class="absolute left-0 right-0 m-auto w-2/5 md:w-[528px] z-50 transition-all rounded-lg overflow-hidden pointer-events-auto top-1/2 -translate-y-1/2"
    >
        {#if actionsMenuData.menuName}
            <div class="pb-4 bg-contrast/80 backdrop-blur">
                <div class="h-24 w-full relative mb-8">
                    <div class="flex">
                        <div class="relative w-[20%] flex justify-center items-center">
                            <div class="absolute bg-secondary rounded-3xl h-20 w-20 z-10" />
                            <div class="aspect-ratio flex h-16 justify-center my-auto rounded z-20">
                                <WokaFromUserId
                                    userId={-1}
                                    placeholderSrc={""}
                                    customHeight="42&& !$cameraEnergySavingStorepx"
                                    customWidth="64px"
                                />
                            </div>
                        </div>
                        <div class="z-20 mt-6 flex-grow w-[80%]">
                            <div class="" />
                            <div class="text-white pl-4">
                                {actionsMenuData.menuName}
                            </div>
                            <div class="" />
                            <p class="text-sm opacity-50 text-white px-4">
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                                incididunt.
                            </p>
                        </div>
                    </div>
                </div>
                <div class="flex">
                    <div class="flex flex-col items-end justify-center gap-y-4 w-[20%]">
                        <ProfilIcon />
                        <ProfilIcon />
                    </div>
                    <div class="flex-grow w-[80%]">
                        <p class="text-sm opacity-50 text-white px-4">a.alexandre@workadventu.re</p>
                        <p class="text-sm opacity-50 text-white px-4">a.alexandre@workadventu.re</p>
                    </div>
                </div>
            </div>
        {/if}
        <div class="flex items-center bg-contrast" class:margin-close={!actionsMenuData.menuName}>
            <button type="button" class="btn btn-ghost justify-center basis-1/2 m-2 w-full" on:click={closeActionsMenu}>
                {$LL.actionbar.close()}
            </button>
            {#if sortedActions}
                {#each sortedActions ?? [] as action (action.actionName)}
                    <button
                        type="button"
                        class="btn bg-secondary justify-center basis-1/2 m-2 w-full {action.style ?? ''}"
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
