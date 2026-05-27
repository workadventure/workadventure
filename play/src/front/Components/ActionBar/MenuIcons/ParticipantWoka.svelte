<script lang="ts">
    import type { Readable } from "svelte/store";
    import Woka from "../../Woka/Woka.svelte";
    import Spinner from "../../Icons/Spinner.svelte";

    interface Props {
        pictureStore: Readable<string | undefined>;
        fallbackName: string;
    }

    let { pictureStore, fallbackName }: Props = $props();

    function getInitial(name: string): string {
        return name.trim().charAt(0).toUpperCase() || "?";
    }
</script>

{#if $pictureStore !== undefined}
    {#if $pictureStore}
        <Woka src={$pictureStore} customWidth="36px" />
    {:else}
        <span class="text-white font-semibold text-sm">{getInitial(fallbackName)}</span>
    {/if}
{:else}
    <div class="flex items-center justify-center w-9 h-9" aria-label="Loading avatar">
        <Spinner size="sm" fillColor="fill-white" />
    </div>
{/if}
