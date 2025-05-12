<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { wokaMenuStore } from "../../Stores/WokaMenuStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import VisitCard from "../VisitCard/VisitCard.svelte";
    import WokaFromUserId from "../Woka/WokaFromUserId.svelte";

    import type { WokaMenuAction, WokaMenuData } from "../../Stores/WokaMenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";

    let wokaMenuData: WokaMenuData | undefined;
    let sortedActions: WokaMenuAction[] | undefined;

    let wokaMenuStoreUnsubscriber: Unsubscriber | null;

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeActionsMenu();
        }
    }

    function closeActionsMenu() {
        wokaMenuStore.clear();
    }

    let buttonsLayout: "row" | "column" = "row";

    wokaMenuStoreUnsubscriber = wokaMenuStore.subscribe((value) => {
        wokaMenuData = value;
        if (wokaMenuData) {
            sortedActions = [...wokaMenuData.actions.values()].sort((a, b) => {
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
            const nbButtons = sortedActions.length + (wokaMenuData.wokaName ? 0 : 1);
            if (nbButtons > 2) {
                buttonsLayout = "column";
            } else {
                buttonsLayout = "row";
            }
        }
    });

    onDestroy(() => {
        if (wokaMenuStoreUnsubscriber) {
            wokaMenuStoreUnsubscriber();
        }
    });
</script>

<svelte:window on:keydown={onKeyDown} />

{#if wokaMenuData}
    <div
        class="absolute left-0 right-0 m-auto max-w-md z-50 bg-contrast/80 transition-all backdrop-blur rounded-lg pointer-events-auto overflow-hidden top-1/2 -translate-y-1/2"
        data-testid="actions-menu"
    >
        {#if wokaMenuData.wokaName}
            <div>
                <div class="w-full bg-cover relative">
                    <div class="absolute top-2 right-2">
                        <ButtonClose on:click={closeActionsMenu} />
                    </div>

                    <div class="flex items-center justify-center p-2">
                        <div class="text-white flex flex-col justify-center items-center font-bold text-xl ">
                            <div
                                id="woka"
                                class=" bt-3 overflow-hidden mt-3 border w-fit h-fit rounded-lg cursor-not-allowed bg-[rgb(103,185,133)]"
                            >
                                <WokaFromUserId
                                    userId={wokaMenuData.userId}
                                    placeholderSrc="/assets/placeholder-woka.png"
                                    customWidth="4rem"
                                />
                            </div>
                            <div class=" w-max mt-[29px] ">
                                <h3>{wokaMenuData.wokaName}</h3>
                            </div>
                        </div>
                    </div>

                    {#if wokaMenuData.visitCardUrl}
                        <VisitCard
                            visitCardUrl={wokaMenuData.visitCardUrl}
                            isEmbedded={true}
                            showSendMessageButton={false}
                        />
                    {/if}
                </div>
            </div>
        {/if}

        {#if sortedActions}
            <div
                class="flex items-center bg-contrast px-2"
                class:margin-close={!wokaMenuData.wokaName}
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
                {#if !wokaMenuData.wokaName}
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
