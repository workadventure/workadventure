<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import VisitCard from "../VisitCard/VisitCard.svelte";

    import type { ActionsMenuAction, ActionsMenuData } from "../../Stores/ActionsMenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";

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

    let buttonsLayout: "row" | "column" = "row";

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
            const nbButtons = sortedActions.length + (actionsMenuData.menuName ? 0 : 1);
            if (nbButtons > 2) {
                buttonsLayout = "column";
            } else {
                buttonsLayout = "row";
            }
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
                    <div class="absolute top-2 right-2">
                        <ButtonClose on:click={closeActionsMenu} />
                    </div>

                    <div class="flex items-center justify-center p-2">
                        <div class="text-white flex flex-col justify-center items-center font-bold text-xl pl-3">
                            <div class="w-max ml-5 mt-[29px] ">
                                <h3>{actionsMenuData.menuName}</h3>
                            </div>
                        </div>
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

        {#if sortedActions}
            <div
                class="flex items-center bg-contrast px-2"
                class:margin-close={!actionsMenuData.menuName}
                class:flex-col={buttonsLayout === "column"}
                class:flex-row={buttonsLayout === "row"}
            >
                {#each sortedActions ?? [] as action (action.uuid)}
                    <button
                        type="button"
                        class="btn btn-light btn-ghost text-nowrap justify-center m-2 w-full {action.style ?? ''}"
                        class:mx-2={buttonsLayout === "column"}
                        on:click={() => analyticsClient.clickPropertyMapEditor(action.actionName, action.style)}
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
                {#if !actionsMenuData.menuName}
                    <button
                        type="button"
                        class="btn btn-light btn-ghost text-nowrap justify-center m-2 w-full"
                        on:click|preventDefault|stopPropagation={closeActionsMenu}
                    >
                        {$LL.actionbar.close()}
                    </button>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
</style>
