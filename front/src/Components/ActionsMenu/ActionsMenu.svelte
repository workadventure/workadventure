<script lang="typescript">
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import { onDestroy } from "svelte";

    import type { Unsubscriber } from "svelte/store";
    import type { ActionsMenuData } from "../../Stores/ActionsMenuStore";

    let actionsMenuData: ActionsMenuData | undefined;

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
    });

    onDestroy(() => {
        if (actionsMenuStoreUnsubscriber) {
            actionsMenuStoreUnsubscriber();
        }
    });
</script>

<svelte:window on:keydown={onKeyDown} />

{#if actionsMenuData}
    <div class="actions-menu nes-container is-rounded">
        <button type="button" class="nes-btn is-error close" on:click={closeActionsMenu}>&times</button>
        <h2>{actionsMenuData.playerName}</h2>
        <div class="actions">
            {#each [...actionsMenuData.actions] as { actionName, callback }}
                <button
                    type="button"
                    class="nes-btn"
                    on:click|preventDefault={() => {
                        callback();
                    }}
                >
                    {actionName}
                </button>
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .actions-menu {
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
        width: 260px !important;
        height: max-content !important;
        max-height: 40vh;
        margin-top: 200px;

        pointer-events: auto;
        font-family: "Press Start 2P";
        background-color: #333333;
        color: whitesmoke;

        .actions {
            max-height: calc(100% - 50px);
            width: 100%;
            display: block;
            overflow-x: hidden;
            overflow-y: auto;

            button {
                width: calc(100% - 10px);
                margin-bottom: 10px;
            }
        }

        .actions::-webkit-scrollbar {
            display: none;
        }

        h2 {
            text-align: center;
            margin-bottom: 20px;
            font-family: "Press Start 2P";
        }

        .nes-btn.is-error.close {
            position: absolute;
            top: -20px;
            right: -20px;
        }
    }
</style>
