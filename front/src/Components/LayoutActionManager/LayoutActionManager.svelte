<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }
</script>

<div class="layout-manager-list">
    {#each $layoutManagerActionStore as action}
        <div class="nes-container is-rounded {action.type}" on:click={() => onClick(action.callback)}>
            <p>{action.message}</p>
        </div>
    {/each}
</div>

<style lang="scss">
    div.layout-manager-list {
        pointer-events: auto;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 40px;
        margin-right: auto;
        margin-left: auto;
        padding: 0;
        width: clamp(200px, 20vw, 20vw);
        z-index: 155;

        display: flex;
        flex-direction: column;

        animation: moveMessage 0.5s;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;

        div {
            margin-bottom: 5%;
        }
    }

    div.nes-container.is-rounded {
        padding: 8px 4px;
        text-align: center;

        font-family: Lato;
        color: whitesmoke;
        background-color: rgb(0, 0, 0, 0.5);

        &.warning {
            background-color: #ff9800eb;
            color: #000;
        }
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
