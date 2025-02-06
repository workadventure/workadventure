<script lang="ts">
    import { createPopperActions } from "svelte-popperjs";
    import ActionBarButton from "../ActionBarButton.svelte";
    import EmojiIcon from "../../Icons/EmojiIcon.svelte";
    import EmojiSubMenu from "../EmojiSubMenu.svelte";
    import { activeSecondaryZoneActionBarStore, openedMenuStore } from "../../../Stores/MenuStore";
    import LL from "../../../../i18n/i18n-svelte";

    function toggleEmojiPicker() {
        if ($activeSecondaryZoneActionBarStore === "emote") {
            activeSecondaryZoneActionBarStore.set(undefined);
        } else {
            activeSecondaryZoneActionBarStore.set("emote");
            openedMenuStore.closeAll();
        }
    }

    const [popperRef, popperContent] = createPopperActions({
        placement: "bottom",
        //strategy: 'fixed',
    });
    const extraOpts = {
        modifiers: [
            { name: "offset", options: { offset: [0, 12] } },
            {
                name: "popper-arrow",
                options: {
                    element: ".popper-arrow",
                    padding: 12,
                },
            },

            {
                name: "flip",
                options: {
                    fallbackPlacements: ["top", "top-start", "top-end"],
                },
            },
        ],
    };
</script>

<ActionBarButton
    on:click={() => {
        toggleEmojiPicker();
    }}
    classList="group/btn-emoji"
    tooltipTitle={$LL.actionbar.help.emoji.title()}
    tooltipDesc={$LL.actionbar.help.emoji.desc()}
    state={$activeSecondaryZoneActionBarStore === "emote" ? "active" : "normal"}
    dataTestId={undefined}
    action={popperRef}
>
    <EmojiIcon
        strokeColor={$activeSecondaryZoneActionBarStore === "emote"
            ? "stroke-white fill-white"
            : "stroke-white fill-transparent"}
        hover="group-hover/btn-emoji:fill-white"
    />
</ActionBarButton>
{#if $activeSecondaryZoneActionBarStore === "emote"}
    <div use:popperContent={extraOpts} class="popper-tooltip ">
        <EmojiSubMenu />
    </div>
{/if}
