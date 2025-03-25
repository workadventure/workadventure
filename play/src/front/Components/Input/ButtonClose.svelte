<script lang="ts">
    export let dataTestId: string | undefined = undefined;
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    function handleClick(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        dispatch("click");
    }
</script>

<button
    type="button"
    class="h-12 w-12 rounded close-window hover:bg-danger aspect-square text-2xl "
    data-testid={dataTestId}
    on:click={handleClick}
    >&#215;
</button>
