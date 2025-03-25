<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { onDestroy } from "svelte";
    import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import type { ActionsMenuAction, ActionsMenuData } from "../../Stores/ActionsMenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    // import bgMap from "../images/map-exemple.png";

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
        data-testid="actions-menu"
    >
        {#if actionsMenuData.menuName}
            <div class="mb-4">
                <!-- Fond avec image  -->
                <div class="h-32 w-full  bg-cover relative mb-8 ">
                    <!-- Filtre transparent sur image de fond -->
                    <div class="w-full h-full absolute z-10 " />
                    <!-- Bloc qui est censée afficher le woka -->
                    <div
                        class="h-20 w-20 aspect-ratio bg-white rounded absolute -bottom-4 left-4 z-20 flex items-center justify-center"
                        style="background-color: rgb(103, 185, 133);"
                    >
                        <img
                            id="wokaPicture"
                            class="h-16 w-16 "
                            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAz5JREFUWEfFlktIVFEcxv8TIVRUpkkD5VAmGji9dJGKVDDjELYzWkQQZI9NC1cFbVq0CWrlok0PgyBahO6SGGegQtQW2kshxTTGggnTrKhAoonvjN/lzH17MzqbmTnn3PP9zvd/3AnJfx6hAPo5H8/4Ptf3RhFRwhu3VSn9aHWl+hwZmyj4jrlPU+Nk9Dzfc8PiSTkIQ1QXNAPov7FvEcRVww+AIa5b31BXKwNDw8aU+TdhvCC8AArEdRE3AH3Ny4klAeBWZmFzSOzW3VxwA7DEHWIcbknIJCWcmwu+ABjP+KaI0o9sXy+d/a8t1djWuFMyb7+o+dTHTEF1OLngGyA8v2CIe/UBQmSLi4xSDQxAO4MCMGyBAEpEZMVi/b961FNw8dPHj1iMuHWvq2Bu16EW1Td+T43LXH7F4rhjCEpEchBBrBn7G8luaYrukQe9vXL78gULwKlLV+Voc7P0jbyQs4lWIxeQG4CbCwpQ8XNcKrbG5f5Ar7TVl6uDyyr3WQBmJp6puc7BaTnW0CyT71IyuapKAgHgILoA+kR9XGV/+a98KU6vzL8L9KGvIRGTgymBi063t42J+VBAYK4yLHIwZo07hABmHo/TXTKRzc/aWc/9Xp3QOBcgdMGiZprg7d2EAwHgIS8IinvdfEkAkZqY8SckPJtWCWlnO8SReNnSmJRujsrshxHJjKb/7nUM8UhNXL7PZ2XLjgPy/s0TWVMcloWnF40YM0eK9l+x7MuMplwhXOkoviFcrRyDOCHweb61TO62HJYTPQ/lWveMZR3PfM6OiRuEJ8Du2DlDHJbCWkLU9d2R2h9fZXj1OhlqOmnM6/vw8Mv0dUcXHAFwe4hhwHLcguK4FUKCcSbZITcT7cY+uAWnAMHQYdEpH2wBUHKseyRW/7ecusHeRHsOt+egEMH0+efJjhAu0bg2pBKWfcFcmo4Aermxk+FAhoRicIM5wjlazk6Keafe4Poy4oGkhgOML23lHoaL63AAa+ykTn3BdyfEAXoI9Oy2qxYCeHXNwAAsSwjZ5cY/A0BFYDDbdQC4goEKWXYAliUBIMLScltbthAwzryhua7NEF4tmGBLygH9pWT3kvFat3PjDyquFz87TvYcAAAAAElFTkSuQmCC"
                            loading="lazy"
                            alt="User woka's"
                        />
                    </div>
                    <!-- Nom de l'utilisateur + son rôle -->
                    <div class="px-4 flex items-center bottom-2 absolute z-20">
                        <div class="h5 text-white ml-20 pl-4 ">
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
        <!-- placement des boutons -->
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
