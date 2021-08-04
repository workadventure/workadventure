<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
    import { onDestroy, onMount } from "svelte";
    import { get } from "svelte/store";

    onMount(() => {
        for (const action of get(layoutManagerActionStore)) {
            action.userInputManager?.addSpaceEventListner(action.callback);
            if ( action.type === 'warning') {
                //remove it after 10 sec
                setTimeout(() => {
                    layoutManagerActionStore.removeAction(action);
                }, 10000)
            }
        }
    })

    onDestroy(() => {
        for (const action of get(layoutManagerActionStore)) {
            action.userInputManager?.removeSpaceEventListner(action.callback);
        }
        layoutManagerActionStore.clearActions();
    })

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
    margin: 0 auto;
    padding: 0;
    width: clamp(200px, 20vw, 20vw);

    display: flex;
    flex-direction: column;

    animation: moveMessage .5s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
  }

  div.nes-container.is-rounded {
    padding: 8px 4px;
    text-align: center;

    font-family: Lato;
    color: whitesmoke;
    background-color: rgb(0,0,0,0.5);

    &.warning {
      background-color: #ff9800eb;
      color: #000;
    }
  }

@keyframes moveMessage {
  0% {bottom: 40px;}
  50% {bottom: 30px;}
  100% {bottom: 40px;}
}
</style>