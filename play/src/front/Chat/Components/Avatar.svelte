<script lang="ts">
    export let avatarUrl: string | null = null;
    export let fallbackFirstLetter = "A";


    const AVATAR_BG_COLORS = ["#e9f2ff", "#faeefb", "#e3f7ed", "#ffecf0", "#ffefe4", "#e3f5f8", "#f1efff", "#e0f8d9"];
    const AVATAR_TEXT_COLORS = ["#043894", "#671481", "#004933", "#7e0642", "#850000", "#004077", "#4c05b5", "#004b00"];
    const colorIndex = fallbackFirstLetter.charCodeAt(0) - 97 < AVATAR_BG_COLORS.length ? fallbackFirstLetter.charCodeAt(0) - 97 : 7
    const defaultTextColor = AVATAR_TEXT_COLORS[colorIndex];
    const defaultBackgroundColor = AVATAR_BG_COLORS[colorIndex];

</script>

{#if avatarUrl}
    <img src={avatarUrl} alt={"User avatar"} class="tw-rounded-full tw-h-6 tw-w-6 tw-object-contain tw-bg-white" />
{:else}
    <div class={`tw-rounded-full tw-bg-amber-600 tw-h-6 tw-w-6 tw-text-center tw-uppercase`}
         style:color={defaultTextColor} style:background-color={defaultBackgroundColor}>
        {fallbackFirstLetter}
    </div>
{/if}

