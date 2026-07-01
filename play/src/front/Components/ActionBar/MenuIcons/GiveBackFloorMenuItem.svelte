<script lang="ts">
    import { get } from "svelte/store";
    import ActionBarButton from "../ActionBarButton.svelte";
    import MegaphoneIcon from "../../Icons/MegaphoneIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { givenFloorSpaceStore } from "../../../Stores/MegaphoneStore";
    import { isSpeakerStore } from "../../../Stores/MediaStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";

    // Shown to a user who was given the floor after raising their hand, so they can hand it back themselves.
    function giveBackFloor() {
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
</script>

<ActionBarButton
    onclick={giveBackFloor}
    classList="group/btn-give-back-floor"
    tooltipTitle={$LL.actionbar.help.giveBackFloor.title()}
    tooltipDesc={$LL.actionbar.help.giveBackFloor.desc()}
    state="forbidden"
    dataTestId="give-back-floor-button"
    desc={$LL.actionbar.help.giveBackFloor.desc()}
>
    <MegaphoneIcon />
</ActionBarButton>
