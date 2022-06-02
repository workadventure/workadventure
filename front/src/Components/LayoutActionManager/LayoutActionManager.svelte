<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }
</script>

<div class="layout-manager-list tw-flex tw-flex-col tw-m-auto tw-right-0 tw-left-0 tw-absolute tw-bottom-10">
    {#each $layoutManagerActionStore as action}
        <div class="{action.type} blue-dialog-box tw-w-56 tw-min-h-10" on:click={() => onClick(action.callback)}>
            <p class="tw-text-center tw-m-0 tw-p-2">{action.message}</p>
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

    .message{
        @apply tw-border-light-blue tw-text-light-blue;
    }

    .warning{
        @apply tw-border-pop-yellow tw-text-pop-yellow;
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
