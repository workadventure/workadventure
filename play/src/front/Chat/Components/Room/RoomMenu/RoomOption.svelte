<script lang="ts">
    import { ComponentType, createEventDispatcher } from "svelte";

    export let IconComponent: ComponentType;
    export let title: string;
    export let dataTestId: string | undefined = undefined;
    const dispatch = createEventDispatcher();
</script>

<button
    data-testid={dataTestId}
    class="tw-flex tw-gap-2 tw-items-center hover:tw-bg-gray-500 tw-rounded-md tw-m-0 tw-p-1"
    on:click|stopPropagation|preventDefault={() => dispatch("click")}
>
    <svelte:component this={IconComponent} />
    <span>{title}</span>
</button>
