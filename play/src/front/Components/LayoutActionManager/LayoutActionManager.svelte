<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }


</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="layout-manager-list flex flex-col right-0 left-0 absolute bottom-12 z-[155]">
    {#each $layoutManagerActionStore as action (action.uuid)}
      <div
            class="{action.type === 'warning' ? 'after:bg-warning' : 'after:bg-secondary'}"
            on:click={() => onClick(action.callback)}
        >
            <p class="text-lg pb-5 px-0 {action.type === 'warning' ? 'text-warning' : 'text-white'} text-center">{action.message}</p>
        </div>
    {/each}
</div>
