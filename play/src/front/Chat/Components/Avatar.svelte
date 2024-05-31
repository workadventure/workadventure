<script lang="ts">
    export let avatarUrl: string | null = null;
    export let fallbackFirstLetter = "A";


    const colors = ["CB4288", "C5458A", "BF488C", "B94C8D", "B34F8F", "AD5291", "A75593", "A15995", "9B5C96", "955F98", "8F629A", "89669C", "83699E", "7D6C9F", "776FA1", "7173A3", "6B76A5", "6579A7", "5F7CA8", "5980AA", "5383AC", "4D86AE", "4789B0", "418DB1", "3B90B3", "3593B5"];

    function getColorByFirstLetter(firstLetter: string) {
        if (!firstLetter) {
            return "black";
        }
        const indexColor = firstLetter.toLowerCase().charCodeAt(0) - 97;
        return colors[indexColor];
    }

</script>

{#if avatarUrl}
    <img src={avatarUrl} alt={"User avatar"} class="tw-rounded-full tw-h-6 tw-w-6 tw-object-contain tw-bg-white" />
{:else}
    <div class={`tw-rounded-full tw-bg-amber-600 tw-h-6 tw-w-6 tw-text-center tw-uppercase tw-text-white`}
         style:background-color={`#${getColorByFirstLetter(fallbackFirstLetter)}`}>
        {fallbackFirstLetter}
    </div>
{/if}

