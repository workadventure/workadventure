<script lang="ts">
    import type { Readable } from "svelte/store";
    import { getColorByString } from "../../../Utils/ColorGenerator";
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

<div
    class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-white font-semibold text-sm"
    style:background-color={getColorByString(fallbackName)}
>
    {#if $pictureStore !== undefined}
        {#if $pictureStore}
            <Woka src={$pictureStore} customWidth="36px" />
        {:else}
            <span>{getInitial(fallbackName)}</span>
        {/if}
    {:else}
        <Spinner size="sm" fillColor="fill-white" />
    {/if}
</div>
