<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }
</script>

<div
    class="layout-manager-list flex flex-col m-auto right-0 left-0 absolute bottom-12 mb-12 z-[155] justify-end"
>
    {#each $layoutManagerActionStore as action}
        {#if action.type === "warning"}
            <div
                class="blue-dialog-box w-56 min-h-10 border-pop-yellow text-pop-yellow border border-solid pointer-events-auto"
                on:click={() => onClick(action.callback)}
            >
                <p class="text-center m-0 p-2">{action.message}</p>
            </div>
        {:else}
            <div
                class="blue-dialog-box w-56 min-h-10 border-light-blue text-light-blue border border-solid pointer-events-auto"
                on:click={() => onClick(action.callback)}
            >
                <p class="text-center m-0 p-2">{action.message}</p>
            </div>
        {/if}
    {/each}
</div>

<style lang="scss">
    div.layout-manager-list {
        animation: moveMessage 0.7s;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
    }

    @keyframes moveMessage {
        0% {
            bottom: 40px;
        }
        50% {
            bottom: 30px;
        }
        100% {
            bottom: 40px;
        }
    }
</style>
