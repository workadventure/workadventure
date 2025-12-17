<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { wokaMenuStore, wokaMenuProgressStore } from "../../Stores/WokaMenuStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import VisitCard from "../VisitCard/VisitCard.svelte";
    import WokaFromUserId from "../Woka/WokaFromUserId.svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    import type { WokaMenuAction, WokaMenuData } from "../../Stores/WokaMenuStore";

    let wokaMenuData: WokaMenuData | undefined;
    let sortedActions: WokaMenuAction[] | undefined;
    let remotePlayer: { chatID?: string } | undefined;

    let wokaMenuStoreUnsubscriber: Unsubscriber | null;

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeActionsMenu();
        }
    }

    function closeActionsMenu() {
        wokaMenuStore.clear();
    }

    let buttonsLayout: "row" | "column" | "wrap" = "row";

    wokaMenuStoreUnsubscriber = wokaMenuStore.subscribe((value) => {
        wokaMenuData = value;
        if (wokaMenuData) {
            remotePlayer = gameManager
                .getCurrentGameScene()
                .getRemotePlayersRepository()
                .getPlayers()
                .get(wokaMenuData.userId);
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
            const nbButtons = sortedActions.length + (wokaMenuData.wokaName ? 0 : 1) + (remotePlayer?.chatID ? 1 : 0);
            if (nbButtons < 4) {
                buttonsLayout = "row";
            } else {
                buttonsLayout = "wrap";
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
        class="m-auto my-0 h-fit min-h-fit max-w-lg min-w-48 max-sm:max-w-[89%] z-50 bg-contrast/80 transition-all backdrop-blur rounded-lg pointer-events-auto overflow-hidden md:mr-0"
        data-testid="actions-menu"
    >
        <div>
            <div class="w-full bg-cover relative">
                <div class="absolute top-2 right-2">
                    <ButtonClose on:click={closeActionsMenu} />
                </div>

                <div class="flex items-center justify-center p-2">
                    <div class="text-white flex flex-col justify-center items-center font-bold text-xl">
                        {#if wokaMenuData.userId != undefined && wokaMenuData.userId != -1}
                            <div
                                id="woka"
                                class=" bt-3 overflow-hidden mt-9 border w-fit h-fit pt-3 rounded-lg cursor-not-allowed bg-[rgb(103,185,133)]"
                            >
                                <WokaFromUserId
                                    userId={wokaMenuData.userId}
                                    placeholderSrc="/assets/placeholder-woka.png"
                                    customWidth="4rem"
                                />
                            </div>
                        {/if}
                        <div class=" w-max mt-[29px]">
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

                {#if $wokaMenuProgressStore}
                    <div class="px-4 pb-4 pt-2">
                        <div class="w-full bg-white/10 rounded-full h-2 mb-2">
                            <div
                                class="bg-primary h-2 rounded-full transition-all duration-300"
                                style="width: {$wokaMenuProgressStore.progress}%"
                            />
                        </div>
                        <p class="text-white/80 text-sm text-center animate-pulse">
                            {$wokaMenuProgressStore.message}
                        </p>
                    </div>
                {/if}
            </div>
        </div>

        {#if sortedActions}
            <div
                class="flex items-center bg-contrast w-full justify-center"
                class:margin-close={!wokaMenuData.wokaName}
                class:flex-row={buttonsLayout === "row"}
                class:flex-wrap={buttonsLayout === "wrap"}
            >
                {#each sortedActions ?? [] as action (action.uuid)}
                    <button
                        type="button"
                        data-testid={action.testId}
                        class="btn btn-light btn-ghost text-nowrap justify-center my-2 mx-1 min-w-0 {action.style ??
                            ''}"
                        class:mx-2={buttonsLayout === "column"}
                        on:click={() => analyticsClient.clickPropertyMapEditor(action.actionName, action.style)}
                        on:click|preventDefault={() => {
                            closeActionsMenu();
                            action.callback();
                        }}
                    >
                        <span class="flex flex-row gap-1 items-center justify-center">
                            {#if action.actionIcon && typeof action.actionIcon === "string"}
                                <div class="w-6 h-6">
                                    <img src={action.actionIcon} class="w-full h-full" alt="" />
                                </div>
                            {:else if action.actionIcon && typeof action.actionIcon === "function"}
                                <svelte:component this={action.actionIcon} class="w-6 h-6" />
                            {/if}
                            {action.actionName}
                        </span>
                    </button>
                {/each}

                {#if !wokaMenuData.wokaName}
                    <button
                        type="button"
                        class="btn btn-light btn-ghost text-nowrap justify-center my-2 mx-1 w-fit"
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
