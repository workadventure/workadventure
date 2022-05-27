<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }
</script>

<div class="layout-manager-list tw-flex tw-flex-col tw-m-auto tw-right-0 tw-left-0 tw-absolute tw-bottom-10">
    {#each $layoutManagerActionStore as action}
        <div class="{action.type} tw-bg-dark-purple/95 tw-rounded tw-text-white tw-w-48 tw-self-center tw-m-1 tw-p-1 tw-border-light-blue tw-border-solid tw-align-middle tw-min-h-10" on:click={() => onClick(action.callback)}>
            <p class="tw-text-center tw-text-light-blue tw-m-0 tw-p-2">{action.message}</p>
        </div>
    {/each}
</div>

<style lang="scss">
    div.layout-manager-list {

        z-index: 155;
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
