<script lang="ts">
    import type { LockableAreaPropertyData } from "@workadventure/map-editor";
    import { type Readable, derived, get } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import LockIcon from "../../Icons/LockIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LockOpenIcon from "../../Icons/LockOpenIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { currentPlayerGroupLockStateStore } from "../../../Stores/CurrentPlayerGroupStore";
    import {
        currentPlayerLockableAreasStore,
        type LockableAreaEntry,
    } from "../../../Stores/CurrentPlayerAreaLockStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { setAreaPropertyLockState } from "../../../Stores/AreaPropertyVariablesStore";
    import { type TargetRow, TargetPickerController } from "./TargetPickerController";

    function lockGroupClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }

    function entryKey(entry: LockableAreaEntry): string {
        return `${entry.areaId}:${entry.propertyId}`;
    }

    function lockAreaClick(entry: LockableAreaEntry) {
        const newLockState = !entry.lockState;
        setAreaPropertyLockState(entry.areaId, entry.propertyId, newLockState);
        analyticsClient.trackAdminEvent("map_editor.area.lock.toggled", {
            areaId: entry.areaId,
            areaName: entry.areaName,
            locked: newLockState,
        });
        if (newLockState) {
            const areasManager = gameManager.getCurrentGameScene().getGameMapFrontWrapper().areasManager;
            areasManager?.flashAreaAsLocked(entry.areaId);
        }
    }

    function canLockEntry(entry: LockableAreaEntry): boolean {
        const scene = gameManager.getCurrentGameScene();
        const gameMapAreas = scene.getGameMapFrontWrapper().getGameMap()?.getWamFile()?.getGameMapAreas();
        if (!gameMapAreas) {
            return false;
        }
        const area = gameMapAreas.getArea(entry.areaId);
        if (!area) {
            return false;
        }
        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData",
        );
        if (!lockableProperty) {
            return false;
        }
        if (!lockableProperty.allowedTags || lockableProperty.allowedTags.length === 0) {
            return true;
        }
        const userTags = scene.connection?.getAllTags() ?? [];
        const userTagsSet = new Set(userTags);
        return lockableProperty.allowedTags.some((tag) => userTagsSet.has(tag));
    }

    let lockableAreas = $derived($currentPlayerLockableAreasStore);
    let showAreaLock = $derived(lockableAreas.length > 0);
    let showGroupLock = $derived(!showAreaLock && $currentPlayerGroupLockStateStore !== undefined);

    const BUBBLE_ROW_ID = "bubble";

    // What the button can lock: the bubble (when in one) first, then the lockable areas the player stands in. A store,
    // so an open picker follows the locks changing.
    const rows: Readable<TargetRow[]> = derived(
        [currentPlayerLockableAreasStore, currentPlayerGroupLockStateStore],
        ([$areas, $groupLockState]) => [
            ...($groupLockState !== undefined
                ? [
                      {
                          id: BUBBLE_ROW_ID,
                          label: get(LL).actionbar.help.lock.bubbleLabel(),
                          selected: $groupLockState,
                          testId: "lockable-area-option-bubble",
                      },
                  ]
                : []),
            ...$areas.map((entry, index) => ({
                id: entryKey(entry),
                label: entry.areaName?.trim() || get(LL).actionbar.help.lock.unnamedArea(),
                selected: entry.lockState,
                disabled: !canLockEntry(entry),
                testId: `lockable-area-option-${index}`,
            })),
        ],
    );

    let canLockSomething = $derived($rows.some((row) => !row.disabled));

    let triggerElement: HTMLElement | undefined = $state(undefined);
    const picker = new TargetPickerController(() => triggerElement);

    function lockRow(row: TargetRow): void {
        if (row.id === BUBBLE_ROW_ID) {
            analyticsClient.trackAdminEvent("bubble.lock.toggled");
            lockGroupClick();
            return;
        }
        const entry = lockableAreas.find((candidate) => entryKey(candidate) === row.id);
        if (entry) {
            lockAreaClick(entry);
        }
    }

    function handleClick() {
        picker.actOrPick(rows, {
            title: $LL.actionbar.help.lock.areaPickerTitle(),
            testId: "lockable-area-picker",
            variant: "danger",
            icon: lockIcon,
            onselect: lockRow,
        });
    }

    let lockState = $derived(
        (() => {
            if (showAreaLock) {
                if (lockableAreas.length === 0) {
                    return undefined;
                }
                if (lockableAreas.length === 1) {
                    return lockableAreas[0].lockState;
                }
                return lockableAreas.every((e) => e.lockState) ? true : false;
            }
            if (showGroupLock) {
                return $currentPlayerGroupLockStateStore;
            }
            return undefined;
        })(),
    );

    type ButtonState = "active" | "normal" | "disabled" | "disabledForbidden" | "forbidden";
    let buttonState: ButtonState = $derived.by(() => {
        if (showAreaLock && !canLockSomething) {
            return lockState ? "disabledForbidden" : "disabled";
        }
        return lockState ? "forbidden" : "normal";
    });
</script>

{#if showAreaLock || showGroupLock}
    <ActionBarButton
        onclick={handleClick}
        classList="group/btn-lock"
        tooltipTitle={$LL.actionbar.help.lock.title()}
        tooltipDesc={$LL.actionbar.help.lock.desc()}
        disabledHelp={$openedMenuStore !== undefined || (showAreaLock && !canLockSomething)}
        state={buttonState}
        dataTestId="lock-button"
        media="./static/Videos/LockBubble.mp4"
        desc={$LL.actionbar.help.lock.desc()}
        bind:wrapperDiv={triggerElement}
    >
        {#if lockState}
            <LockIcon />
        {:else}
            <LockOpenIcon />
        {/if}
    </ActionBarButton>
{/if}

{#snippet lockIcon(row: TargetRow)}
    {#if row.selected}
        <LockIcon />
    {:else}
        <LockOpenIcon />
    {/if}
{/snippet}
