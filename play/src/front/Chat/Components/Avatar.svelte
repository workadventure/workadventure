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
        class="tw-rounded-full"
        style="width: 32px; height: 32px;"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
    >
        <WokaFromUserId {userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
    </div>
{:else if userId === -1}
    <div
        class={`tw-rounded-full tw-bg-amber-600 tw-text-center tw-uppercase tw-text-white tw-w-8 tw-h-8`}
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        <WokaFromUserId {userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
    </div>
{:else if avatarUrl}
    <img
        src={avatarUrl}
        alt={"User avatar"}
        class="tw-rounded-sm tw-h-6 tw-w-6 tw-object-contain tw-bg-white"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="tw-rounded tw-bg-amber-600 tw-h-7 tw-w-7 tw-text-center tw-uppercase tw-text-white tw-flex tw-items-center tw-justify-center tw-font-bold"
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
