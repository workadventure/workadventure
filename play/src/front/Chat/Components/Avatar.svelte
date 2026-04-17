<script lang="ts">
    import { getColorByString } from "../../Utils/ColorGenerator";
    import type { PictureStore } from "../../Stores/PictureStore";

    export let pictureStore: PictureStore | undefined;
    export let fallbackName = "A";
    export let color: string | null = null;
    export let isChatAvatar = false;
    /**
     * Compact: 28×28px, `rounded-md` — same as user list rows and chat room rows (Room.svelte, User.svelte).
     * Default: 40×40px, `rounded-sm` — message thread avatars.
     */
    export let compact = false;

    let forceFallback = false;

    $: sizeClass = compact
        ? "h-7 w-7 min-h-[1.75rem] min-w-[1.75rem] shrink-0 rounded-md overflow-hidden"
        : "h-10 w-10 min-h-10 min-w-10 shrink-0 rounded-sm overflow-hidden";
</script>

{#if $pictureStore && !forceFallback}
    <img
        src={$pictureStore}
        alt="User avatar"
        class="object-contain object-center bg-white {sizeClass}"
        draggable="false"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
        on:error={(event) => {
            console.warn(`Failed to load avatar image for ${fallbackName}`, event);
            forceFallback = true;
        }}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="text-center uppercase text-white flex items-center justify-center font-bold aspect-square {sizeClass}"
        draggable="false"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}
