<script lang="ts">
    import { ComponentType, createEventDispatcher } from "svelte";

    export let IconComponent: ComponentType;
    export let title: string;
    export let dataTestId: string | undefined = undefined;
    export let bg = "hover:bg-white/10";
    const dispatch = createEventDispatcher<{
        click: void;
    }>();
</script>

<button
    class="flex gap-2 items-center {bg} m-0 p-2 w-full text-sm rounded"
    data-testid={dataTestId}
    on:click|stopPropagation|preventDefault={() => dispatch("click")}
>
    <svelte:component this={IconComponent} />
    <span>{title}</span>
</button>
