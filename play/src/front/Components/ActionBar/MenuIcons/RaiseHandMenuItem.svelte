<script lang="ts">
    import type { Readable } from "svelte/store";
    import { derived, get } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { requestedHandRaiseState } from "../../../Stores/RaiseHandStore";
    import { isSpeakerStore, silentStore } from "../../../Stores/MediaStore";
    import { givenFloorSpaceStore } from "../../../Stores/MegaphoneStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import RaiseHandIcon from "../../Icons/RaiseHandIcon.svelte";

    // A single control for the whole "ask to speak" lifecycle, so the raise-hand and give-back buttons are
    // never shown at once:
    //   normal -> click raises the hand (request the floor)
    //   active -> the hand is up, waiting; click lowers it
    //   live   -> the host granted the floor (on stage, green); click hands the floor back
    const buttonStateStore: Readable<"active" | "live" | "disabled" | "normal"> = derived(
        [requestedHandRaiseState, silentStore, givenFloorSpaceStore],
        ([$requestedHandRaiseState, $silentStore, $givenFloorSpace]) => {
            if ($givenFloorSpace !== undefined) {
                return "live";
            }
            if ($silentStore) {
                return "disabled";
            }
            return $requestedHandRaiseState.raised ? "active" : "normal";
        },
    );

    // On stage: hand the floor back yourself (same effect as the former dedicated give-back button).
    function giveBackFloor(): void {
        const space = get(givenFloorSpaceStore);
        if (!space) {
            return;
        }
        analyticsClient.giveBackFloorMeetingAction();
        space.stopStreaming();
        isSpeakerStore.set(false);
        givenFloorSpaceStore.set(undefined);
        notificationPlayingStore.playNotification(get(LL).notification.floorGivenBack(), "microphone-off.png");
    }

    function onClick(): void {
        if (get(givenFloorSpaceStore) !== undefined) {
            giveBackFloor();
            return;
        }
        if ($silentStore) {
            return;
        }
        analyticsClient.raiseHand(!$requestedHandRaiseState.raised);
        requestedHandRaiseState.toggle();
    }
</script>

<ActionBarButton
    onclick={onClick}
    classList="group/btn-raise-hand"
    disabledHelp={$openedMenuStore !== undefined}
    state={$buttonStateStore}
    dataTestId="raise-hand-button"
    tooltipTitle={$givenFloorSpaceStore
        ? $LL.actionbar.help.giveBackFloor.title()
        : $LL.actionbar.help.raiseHand.title()}
    desc={$givenFloorSpaceStore ? $LL.actionbar.help.giveBackFloor.desc() : $LL.actionbar.help.raiseHand.desc()}
>
    <RaiseHandIcon
        strokeColor={$requestedHandRaiseState.raised || $givenFloorSpaceStore
            ? "stroke-contrast fill-white"
            : "stroke-white fill-transparent"}
        hover="group-hover/btn-raise-hand:fill-white"
    />
</ActionBarButton>
