<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }
</script>

<div
    class="layout-manager-list tw-flex tw-flex-col tw-m-auto tw-right-0 tw-left-0 tw-absolute tw-bottom-12 tw-mb-12 tw-z-[155] tw-justify-end"
>
    {#each $layoutManagerActionStore as action (action.uuid)}
        {#if action.type === "warning"}
            <div
                class="blue-dialog-box tw-w-56 tw-min-h-10 tw-border-pop-yellow tw-text-pop-yellow tw-border tw-border-solid tw-pointer-events-auto"
                on:click={() => onClick(action.callback)}
            >
                <p class="tw-text-center tw-m-0 tw-p-2">{action.message}</p>
            </div>
        {:else}
            <div
                class="blue-dialog-box tw-w-56 tw-min-h-10 tw-border-light-blue tw-text-light-blue tw-border tw-border-solid tw-pointer-events-auto"
                on:click={() => onClick(action.callback)}
            >
                <p class="tw-text-center tw-m-0 tw-p-2">{action.message}</p>
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
