<script>
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
</script>

<button
    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
    on:click={() => {
        dispatch("click");
    }}
>
    <span class="transition-all w-6 h-6 aspect-square text-center">
        <slot name="icon" />
    </span>
    <span><slot name="label" /></span>
</button>
