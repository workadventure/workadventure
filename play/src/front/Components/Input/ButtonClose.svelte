<script lang="ts">
    export let dataTestId: string | undefined = undefined;
    export let bgColor = "bg-white/10";
    export let hoverColor = "bg-white/20";
    export let textColor = "text-white";
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
    class="h-12 w-12 rounded backdrop-blur close-window transition-all aspect-square text-2xl !{textColor} {bgColor} hover:{hoverColor} close-btn"
    data-testid={dataTestId}
    on:click={handleClick}
    >&#215;
</button>
