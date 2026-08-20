<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { toggleWokaEmoteWheel, wokaEmoteWheelVisibleStore } from "../../../Stores/WokaEmoteStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { IconWalk } from "@wa-icons";

    function toggle() {
        if (!$wokaEmoteWheelVisibleStore) {
            openedMenuStore.closeAll();
        }
        toggleWokaEmoteWheel();
    }
</script>

<ActionBarButton
    onclick={toggle}
    classList="group/btn-woka-emote"
    tooltipTitle={$LL.actionbar.help.wokaEmote.title()}
    tooltipShortcuts={["G"]}
    state={$wokaEmoteWheelVisibleStore ? "active" : "normal"}
    dataTestId="woka-emote-btn"
    desc={$LL.actionbar.help.wokaEmote.desc()}
>
    <IconWalk font-size={20} class={$wokaEmoteWheelVisibleStore ? "text-contrast" : "text-white"} />
</ActionBarButton>
