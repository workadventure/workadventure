<script lang="ts">
    import type { PictureStore } from "../../Stores/PictureStore";
    import { getColorByString } from "../../Utils/ColorGenerator";
    import Woka from "../Woka/Woka.svelte";

    // Shows the user's Woka when we can resolve it (proximity, or megaphone with seeAttendees). Falls back to a
    // colored initial only when there is no SpaceUser for the entry (megaphone listener without seeAttendees).
    interface Props {
        pictureStore: PictureStore | undefined;
        name: string;
    }

    let { pictureStore, name }: Props = $props();
</script>

{#if $pictureStore}
    <div class="flex h-7 w-7 shrink-0 items-center justify-center">
        <Woka src={$pictureStore} customWidth="28px" />
    </div>
{:else}
    <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold uppercase text-white"
        style:background-color={getColorByString(name)}
    >
        {name.charAt(0)}
    </div>
{/if}
