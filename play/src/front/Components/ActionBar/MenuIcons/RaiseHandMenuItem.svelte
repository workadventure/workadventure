<script lang="ts">
    import type { Readable } from "svelte/store";
    import { derived } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { requestedHandRaiseState } from "../../../Stores/RaiseHandStore";
    import { silentStore } from "../../../Stores/MediaStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import RaiseHandIcon from "../../Icons/RaiseHandIcon.svelte";

    const raiseHandButtonStateStore: Readable<"active" | "disabled" | "normal"> = derived(
        [requestedHandRaiseState, silentStore],
        ([$requestedHandRaiseState, $silentStore]) => {
            if ($silentStore) {
                return "disabled";
            }
            return $requestedHandRaiseState.raised ? "active" : "normal";
        },
    );

    function raiseHandClick(): void {
        if ($silentStore) return;
        analyticsClient.raiseHand(!$requestedHandRaiseState.raised);
        requestedHandRaiseState.toggle();
    }
</script>

<ActionBarButton
    onclick={raiseHandClick}
    classList="group/btn-raise-hand"
    disabledHelp={$openedMenuStore !== undefined}
    state={$raiseHandButtonStateStore}
    dataTestId="raise-hand-button"
    tooltipTitle={$LL.actionbar.help.raiseHand.title()}
    desc={$LL.actionbar.help.raiseHand.desc()}
>
    <RaiseHandIcon
        strokeColor={$requestedHandRaiseState.raised ? "stroke-contrast fill-white" : "stroke-white fill-transparent"}
        hover="group-hover/btn-raise-hand:fill-white"
    />
</ActionBarButton>
