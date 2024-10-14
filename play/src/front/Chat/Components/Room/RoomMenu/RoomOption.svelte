<script lang="ts">
    import { ComponentType, createEventDispatcher } from "svelte";

    export let IconComponent: ComponentType;
    export let title: string;
    export let dataTestId: string | undefined = undefined;
    export let bg = "hover:tw-bg-white/10"
    const dispatch = createEventDispatcher();
</script>

<button
    class="tw-flex tw-gap-2 tw-items-center {bg} tw-m-0 tw-p-2 tw-w-full tw-text-sm tw-rounded"
    data-testid={dataTestId}
    on:click|stopPropagation|preventDefault={() => dispatch("click")}
>
    <svelte:component this={IconComponent} />
    <span>{title}</span>
</button>
