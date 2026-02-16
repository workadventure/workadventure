<script lang="ts">
    import SelectionCheckOverlay from "./SelectionCheckOverlay.svelte";

    export let thumbnail: string;
    export let name: string;
    export let isSelected: boolean;
    export let onClick: () => void;
    export let blurClass: string = "";
</script>

<button
    class="relative w-full aspect-square rounded-md border-2 transition-all hover:brightness-50"
    on:click={onClick}
    title={name}
>
    <div
        class="absolute inset-0 rounded-sm overflow-hidden {isSelected
            ? 'border-white border-solid border-2'
            : 'border-transparent hover:border-white/30'}"
    >
        <img src={thumbnail} alt={name} class="w-full h-full object-cover {blurClass}" />
    </div>
    {#if isSelected}
        <SelectionCheckOverlay />
    {/if}
</button>
