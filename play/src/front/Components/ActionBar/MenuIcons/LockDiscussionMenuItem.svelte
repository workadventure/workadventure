<script lang="ts">
    import type { LockableAreaPropertyData } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import LockIcon from "../../Icons/LockIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LockOpenIcon from "../../Icons/LockOpenIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { currentPlayerGroupLockStateStore } from "../../../Stores/CurrentPlayerGroupStore";
    import {
        currentPlayerLockableAreasStore,
        areaPropertiesUpdateTriggerStore,
        type LockableAreaEntry,
    } from "../../../Stores/CurrentPlayerAreaLockStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { setAreaPropertyLockState } from "../../../Stores/AreaPropertyVariablesStore";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import LockableAreaPicker from "../../PopUp/LockableAreaPicker.svelte";

    function lockGroupClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }

    function entryKey(entry: LockableAreaEntry): string {
        return `${entry.areaId}:${entry.propertyId}`;
    }

    function lockAreaClick(entry: LockableAreaEntry) {
        const newLockState = !entry.lockState;
        setAreaPropertyLockState(entry.areaId, entry.propertyId, newLockState);
        if (newLockState) {
            const areasManager = gameManager.getCurrentGameScene().getGameMapFrontWrapper().areasManager;
            areasManager?.flashAreaAsLocked(entry.areaId);
        }
    }

    function canLockEntry(entry: LockableAreaEntry): boolean {
        const scene = gameManager.getCurrentGameScene();
        const gameMapAreas = scene.getGameMapFrontWrapper().getGameMap()?.getGameMapAreas();
        if (!gameMapAreas) {
            return false;
        }
        const area = gameMapAreas.getArea(entry.areaId);
        if (!area) {
            return false;
        }
        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData"
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

    $: lockableAreas = $currentPlayerLockableAreasStore;
    $: showAreaLock = lockableAreas.length > 0;
    $: showGroupLock = !showAreaLock && $currentPlayerGroupLockStateStore !== undefined;

    // Force reactivity on area properties update
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _trigger = $areaPropertiesUpdateTriggerStore;

    $: areasWithPermission = (() => {
        const set = new Set<string>();
        for (const entry of lockableAreas) {
            if (canLockEntry(entry)) {
                set.add(entryKey(entry));
            }
        }
        return set;
    })();

    $: canLockAtLeastOne = areasWithPermission.size > 0;

    $: hasBubbleOption = $currentPlayerGroupLockStateStore !== undefined;
    $: showPicker = lockableAreas.length > 1 || (lockableAreas.length === 1 && hasBubbleOption);
    /** True when user can lock at least one area OR can lock the bubble (picker with bubble row). */
    $: canLockSomething = canLockAtLeastOne || (showPicker && hasBubbleOption);

    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = undefined;

    function closePicker(): void {
        closeFloatingUi?.();
        closeFloatingUi = undefined;
    }

    function handleClick() {
        if (showAreaLock && !canLockSomething) {
            return;
        }

        if (showAreaLock) {
            if (!showPicker) {
                const entry = lockableAreas[0];
                if (canLockEntry(entry)) {
                    analyticsClient.lockDiscussion();
                    lockAreaClick(entry);
                }
                return;
            }

            if (showPicker) {
                if (closeFloatingUi) {
                    closePicker();
                    return;
                }
                if (!triggerElement) {
                    return;
                }
                analyticsClient.lockDiscussion();
                closeFloatingUi = showFloatingUi(
                    triggerElement,
                    LockableAreaPicker,
                    {
                        areas: lockableAreas,
                        areasWithPermission,
                        onSelect: (entry: LockableAreaEntry) => {
                            lockAreaClick(entry);
                        },
                        onClose: closePicker,
                        groupLockState:
                            $currentPlayerGroupLockStateStore !== undefined
                                ? $currentPlayerGroupLockStateStore
                                : undefined,
                        onSelectGroupLock:
                            $currentPlayerGroupLockStateStore !== undefined
                                ? () => {
                                      analyticsClient.lockDiscussion();
                                      lockGroupClick();
                                  }
                                : undefined,
                    },
                    { placement: "bottom" },
                    8,
                    true
                );
                return;
            }
        }

        if (showGroupLock) {
            analyticsClient.lockDiscussion();
            lockGroupClick();
        }
    }

    $: lockState = (() => {
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
    })();

    type ButtonState = "active" | "normal" | "disabled" | "disabledForbidden" | "forbidden";
    let buttonState: ButtonState = "normal";

    $: buttonState = (() => {
        if (showAreaLock && !canLockSomething) {
            return lockState ? ("disabledForbidden" as const) : ("disabled" as const);
        }
        return lockState ? ("forbidden" as const) : ("normal" as const);
    })();

    onDestroy(() => {
        closePicker();
    });
</script>

{#if showAreaLock || showGroupLock}
    <ActionBarButton
        on:click={handleClick}
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
