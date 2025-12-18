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
        class="m-auto my-0 h-fit min-h-fit max-w-lg min-w-48 max-sm:max-w-[89%] z-50 bg-contrast/80 transition-all backdrop-blur rounded-lg pointer-events-auto overflow-hidden md:mr-0"
        data-testid="actions-menu"
    >
        <div>
            <div class="w-full bg-cover relative">
                <div class="absolute top-2 right-2">
                    <ButtonClose on:click={closeActionsMenu} dataTestId="closeActionsMenuButton" />
                </div>

                <div class="flex flex-col items-center justify-center gap-2 p-2 py-6">
                    {#if actionsMenuData.textureUrl}
                        <div
                            class="p-1 overflow-hidden border w-fit h-fit rounded-lg cursor-not-allowed bg-[rgb(103,185,133)]"
                        >
                            <img
                                src={actionsMenuData.textureUrl}
                                alt={actionsMenuData.menuName}
                                class="w-16 h-16 object-contain"
                                style="image-rendering: pixelated"
                            />
                        </div>
                    {/if}
                    <h3 class="p-0 m-0">{actionsMenuData.menuName}</h3>
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

        {#if sortedActions}
            <div
                class="flex items-center bg-contrast/80 p-2 gap-2"
                class:margin-close={!actionsMenuData.menuName}
                class:flex-col={buttonsLayout === "column"}
                class:flex-row={buttonsLayout === "row"}
            >
                {#each sortedActions ?? [] as action (action.uuid)}
                    <button
                        type="button"
                        class="btn btn-light btn-ghost text-nowrap justify-center w-full h-full !bg-white/10 hover:!bg-white/20 {action.style ??
                            ''}"
                        class:mx-2={buttonsLayout === "column"}
                        on:click={() => analyticsClient.clickPropertyMapEditor(action.actionName, action.style)}
                        on:click|preventDefault={async () => {
                            await action.callback();
                        }}
                    >
                        <span class="flex flex-row gap-2 items-center justify-center text-nowrap">
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
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
</style>
