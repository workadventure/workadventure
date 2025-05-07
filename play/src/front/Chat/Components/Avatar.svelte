<script lang="ts">
    import WokaFromUserId from "../../Components/Woka/WokaFromUserId.svelte";
    import { getColorByString } from "../../Utils/ColorGenerator";

    export let avatarUrl: string | null = null;
    export let userId: number | string | null = null;
    export let fallbackName = "A";
    export let color: string | null = null;
    export let isChatAvatar = false;
</script>

{#if userId && userId != -1}
    <div
        class="rounded-full"
        style="width: 32px; height: 32px;"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
    >
        <WokaFromUserId {userId} placeholderSrc="" customWidth="32px" />
    </div>
{:else if userId === -1}
    <div
        class="rounded-full bg-amber-600 text-center uppercase text-white w-8 h-8"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        <WokaFromUserId {userId} placeholderSrc="" customWidth="32px" />
    </div>
{:else if avatarUrl}
    <img
        src={avatarUrl}
        alt="User avatar"
        class="rounded-sm h-6 w-6 object-contain bg-white"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="rounded-sm bg-amber-600 h-7 w-7 text-center uppercase text-white flex items-center justify-center font-bold"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}

<style>
    .chatAvatar {
        border-style: solid;
        border-color: rgb(27 42 65 / 0.95);
        border-width: 1px;
    }
</style>
