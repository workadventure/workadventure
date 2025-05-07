<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import EmojiIcon from "../../Icons/EmojiIcon.svelte";
    import EmojiSubMenu from "../EmojiSubMenu.svelte";
    import { activeSecondaryZoneActionBarStore, openedMenuStore } from "../../../Stores/MenuStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";

    function toggleEmojiPicker() {
        if ($activeSecondaryZoneActionBarStore === "emote") {
            activeSecondaryZoneActionBarStore.set(undefined);
        } else {
            activeSecondaryZoneActionBarStore.set("emote");
            openedMenuStore.closeAll();
        }
    }

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-start",
            //strategy: 'fixed',
        },
        8
    );
</script>

<ActionBarButton
    on:click={() => {
        toggleEmojiPicker();
    }}
    classList="group/btn-emoji"
    tooltipTitle={$LL.actionbar.help.emoji.title()}
    state={$activeSecondaryZoneActionBarStore === "emote" ? "active" : "normal"}
    dataTestId={undefined}
    action={floatingUiRef}
    media="./static/Videos/Smileys.mp4"
    desc={$LL.actionbar.help.emoji.desc()}
>
    <EmojiIcon
        strokeColor={$activeSecondaryZoneActionBarStore === "emote"
            ? "stroke-contrast fill-white"
            : "stroke-white fill-transparent"}
        hover="group-hover/btn-emoji:fill-white"
    />
</ActionBarButton>
{#if $activeSecondaryZoneActionBarStore === "emote"}
    <div use:floatingUiContent class="absolute">
        <EmojiSubMenu {arrowAction} />
    </div>
{/if}
