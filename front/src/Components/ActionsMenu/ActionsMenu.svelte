<script lang="typescript">
    import { fly } from "svelte/transition";
    import { ActionsMenuInterface, actionsMenuStore } from '../../Stores/ActionsMenuStore';
    import { requestActionsMenuStore, requestVisitCardsStore } from '../../Stores/GameStore';

    let possibleActions: Map<string, ActionsMenuInterface>;
    let backgroundHeight = 100;
    const unsubscribe = actionsMenuStore.subscribe(value => {
        possibleActions = value;
    });

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeActionsMenu();
        }
    }

    function closeActionsMenu() {
        requestActionsMenuStore.set(false);
    }

</script>

<svelte:window on:keydown={onKeyDown} />

<div class="actions-menu nes-container is-rounded" style="--background-height: {backgroundHeight};">
    <button type="button" class="nes-btn is-error close" on:click={closeActionsMenu}>&times</button>
    <h2>Actions</h2>
    <div class="actions">
        {#each [...possibleActions] as [key, menuAction]}
            <button
                type="button"
                class="nes-btn"
                on:click|preventDefault={() => { menuAction.callback(); }}
            >
                {menuAction.displayName}
            </button>
            {/each}
    </div>
</div>

<style lang="scss">
    .actions-menu {        
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
        width: 260px !important;
        max-height: 300px;
        margin-top: 200px;

        pointer-events: auto;
        font-family: "Press Start 2P";
        background-color: #333333;
        color: whitesmoke;

        .actions {
            max-height: 200px;
            width: 100%;
            display:block;
            overflow-x:hidden;
            overflow-y:auto;

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