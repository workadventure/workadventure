<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";

    export let enabled = false;

    const dispatch = createEventDispatcher<{
        click: void;
    }>();
</script>

<button
    class="user-menu-btn p-0 h-5 w-5 flex items-center justify-center mr-1 rounded-sm hover:bg-white/20 right-0 top-0 bottom-0 m-auto transition-all pointer-events-auto {enabled
        ? 'bg-white/20 hover:bg-white/30'
        : ''}"
    on:click={() => dispatch("click")}
>
    <ChevronDownIcon
        strokeWidth="2.5"
        height="h-4"
        width="w-4"
        classList="aspect-ratio transition-all {enabled ? 'rotate-180' : ''}"
    />
</button>
