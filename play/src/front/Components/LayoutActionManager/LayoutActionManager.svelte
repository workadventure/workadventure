<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";

    function onClick(callback: () => void) {
        callback();
    }
</script>

<div
    class="layout-manager-list flex flex-col m-auto right-0 left-0 absolute bottom-12 z-[155] justify-end animate-bounce"
>
    {#each $layoutManagerActionStore as action (action.uuid)}
        <div
            class="blue-dialog-box w-64 min-h-10 m-auto bg-contrast/80 backdrop-blur rounded-lg relative after:content-[''] after:absolute after:w-11/12 after:left-0 after:right-0 after:m-auto after:h-2  after:rounded after:-top-3  {action.type ===
            'warning'
                ? 'after:bg-warning'
                : 'after:bg-secondary'}"
            on:click={() => onClick(action.callback)}
        >
            <p class="text-lg m-0 py-4 px-8 {action.type === 'warning' ? 'text-warning' : 'text-white'} text-center">
                {action.message}
            </p>
        </div>
    {/each}
</div>
