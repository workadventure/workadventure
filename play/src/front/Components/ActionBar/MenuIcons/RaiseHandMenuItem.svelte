<script lang="ts">
    import type { Readable } from "svelte/store";
    import { derived, get } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { isHandRaisedStore, requestedHandRaiseState } from "../../../Stores/RaiseHandStore";
    import { raiseHandSpacesStore } from "../../../Stores/RaiseHandAvailabilityStore";
    import { isSpeakerStore, silentStore } from "../../../Stores/MediaStore";
    import { givenFloorSpaceStore } from "../../../Stores/MegaphoneStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { spaceLabel } from "../../../Space/spaceLabel";
    import { LL } from "../../../../i18n/i18n-svelte";
    import RaiseHandIcon from "../../Icons/RaiseHandIcon.svelte";
    import { type TargetRow, TargetPickerController } from "./TargetPickerController";

    // A single control for the whole "ask to speak" lifecycle, so the raise-hand and give-back buttons are
    // never shown at once:
    //   normal -> click raises the hand (request the floor)
    //   active -> the hand is up, waiting; click lowers it
    //   live   -> the host granted the floor (on stage, green); click hands the floor back
    // With several spaces to raise the hand in (e.g. a bubble inside a listener zone), the click opens a picker
    // instead, like the lock button does.
    const buttonStateStore: Readable<"active" | "live" | "disabled" | "normal"> = derived(
        [isHandRaisedStore, silentStore, givenFloorSpaceStore],
        ([$isHandRaised, $silentStore, $givenFloorSpace]) => {
            if ($givenFloorSpace !== undefined) {
                return "live";
            }
            if ($silentStore) {
                return "disabled";
            }
            return $isHandRaised ? "active" : "normal";
        },
    );

    let triggerElement: HTMLElement | undefined = $state(undefined);
    const picker = new TargetPickerController(() => triggerElement);

    // The spaces the hand can go to, as picker rows (a store, so an open picker follows the hands going up and down).
    const rows: Readable<TargetRow[]> = derived(
        [raiseHandSpacesStore, requestedHandRaiseState],
        ([$spaces, $raisedIn]) =>
            $spaces.map((space, index) => {
                const kind = space.kind ?? "space";
                const sameKind = $spaces.filter((other) => (other.kind ?? "space") === kind).length > 1;
                return {
                    id: space.getName(),
                    label: spaceLabel(space),
                    selected: $raisedIn.has(space.getName()),
                    testId: `raise-hand-space-option-${kind}${sameKind ? `-${index}` : ""}`,
                };
            }),
    );

    // On stage: hand the floor back yourself (same effect as the former dedicated give-back button).
    function giveBackFloor(): void {
        const space = get(givenFloorSpaceStore);
        if (!space) {
            return;
        }
        analyticsClient.trackAdminEvent("meeting.floor.given_back");
        space.stopStreaming();
        isSpeakerStore.set(false);
        givenFloorSpaceStore.set(undefined);
        notificationPlayingStore.playNotification(get(LL).notification.floorGivenBack(), "microphone-off.png");
    }

    function toggleHand(spaceName: string): void {
        analyticsClient.trackAdminEvent("meeting.hand.toggled", {
            raised: !get(requestedHandRaiseState).has(spaceName),
        });
        requestedHandRaiseState.toggle(spaceName);
    }

    function onClick(): void {
        if (get(givenFloorSpaceStore) !== undefined) {
            giveBackFloor();
            return;
        }
        if ($silentStore) {
            return;
        }
        picker.actOrPick(rows, {
            title: $LL.actionbar.help.raiseHand.title(),
            testId: "raise-hand-space-picker",
            icon: handIcon,
            onselect: (row: TargetRow) => toggleHand(row.id),
        });
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
    bind:wrapperDiv={triggerElement}
>
    <RaiseHandIcon
        strokeColor={$isHandRaisedStore || $givenFloorSpaceStore
            ? "stroke-contrast fill-white"
            : "stroke-white fill-transparent"}
        hover="group-hover/btn-raise-hand:fill-white"
    />
</ActionBarButton>

{#snippet handIcon(row: TargetRow)}
    <RaiseHandIcon
        height="h-5"
        width="w-5"
        strokeColor={row.selected ? "stroke-contrast fill-white" : "stroke-white fill-transparent"}
        hover=""
    />
{/snippet}
