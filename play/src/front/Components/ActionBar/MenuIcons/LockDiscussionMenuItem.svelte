<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import LockIcon from "../../Icons/LockIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LockOpenIcon from "../../Icons/LockOpenIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { currentPlayerGroupLockStateStore } from "../../../Stores/CurrentPlayerGroupStore";
import {
    currentPlayerAreaLockStateStore,
    currentPlayerAreaIdStore,
    areaPropertiesUpdateTriggerStore,
} from "../../../Stores/CurrentPlayerAreaLockStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { LockableAreaPropertyData } from "@workadventure/map-editor";
    import { v4 as uuid } from "uuid";

    function lockGroupClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }

    function lockAreaClick() {
        const areaId = $currentPlayerAreaIdStore;
        if (!areaId) {
            return;
        }

        const scene = gameManager.getCurrentGameScene();
        if (!scene) {
            return;
        }

        const gameMapAreas = scene.gameMapFrontWrapper.getGameMap()?.getGameMapAreas();
        if (!gameMapAreas) {
            return;
        }

        const area = gameMapAreas.getArea(areaId);
        if (!area) {
            return;
        }

        // Find lockableAreaPropertyData property
        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData"
        );

        if (!lockableProperty) {
            return;
        }

        // Update lock status
        const currentLockState = $currentPlayerAreaLockStateStore ?? false;
        const newLockStatus = !currentLockState;

        const updatedProperties = area.properties.map((property) => {
            if (property.id === lockableProperty.id) {
                return {
                    ...property,
                    lock: newLockStatus,
                } as LockableAreaPropertyData;
            }
            return property;
        });

        // Emit area update to synchronize with server
        const commandId = uuid();
        scene.connection?.emitMapEditorModifyArea(commandId, {
            id: areaId,
            properties: updatedProperties,
        });
    }

    // Determine if we should show area lock or group lock
    $: showAreaLock = $currentPlayerAreaIdStore !== undefined;
    $: showGroupLock = !showAreaLock && $currentPlayerGroupLockStateStore !== undefined;

    // Check if user has permission to lock/unlock the area
    // Force reactivity by depending on areaId, lock state, and area properties update trigger
    $: canLockArea = (() => {
        if (!showAreaLock) {
            return true; // Not an area lock, so permission check doesn't apply
        }

        const areaId = $currentPlayerAreaIdStore;
        if (!areaId) {
            return false;
        }

        // Force reactivity by reading the lock state and properties update trigger
        const _ = $currentPlayerAreaLockStateStore;
        const __ = $areaPropertiesUpdateTriggerStore;

        const scene = gameManager.getCurrentGameScene();
        const gameMapAreas = scene.gameMapFrontWrapper.getGameMap()?.getGameMapAreas();
        if (!gameMapAreas) {
            return false;
        }

        const area = gameMapAreas.getArea(areaId);
        if (!area) {
            return false;
        }

        const lockableProperty = area.properties.find(
            (property): property is LockableAreaPropertyData => property.type === "lockableAreaPropertyData"
        );

        if (!lockableProperty) {
            return false;
        }

        // If no allowedTags specified, everyone can lock/unlock
        if (!lockableProperty.allowedTags || lockableProperty.allowedTags.length === 0) {
            return true;
        }

        // Check if user has at least one of the required tags
        // Use Set for O(1) lookup instead of O(n) with includes
        const userTags = scene.connection?.getAllTags() ?? [];
        const userTagsSet = new Set(userTags);
        const hasPermission = lockableProperty.allowedTags.some((tag) => userTagsSet.has(tag));
        
        return hasPermission;
    })();

    function handleClick() {
        if (showAreaLock && !canLockArea) {
            return; // Don't allow click if user doesn't have permission
        }

        if (showAreaLock) {
            analyticsClient.lockDiscussion();
            lockAreaClick();
        } else if (showGroupLock) {
            analyticsClient.lockDiscussion();
            lockGroupClick();
        }
    }

    $: lockState = showAreaLock
        ? $currentPlayerAreaLockStateStore
        : showGroupLock
          ? $currentPlayerGroupLockStateStore
          : undefined;

    // Calculate button state: disabled if user doesn't have permission, otherwise normal/forbidden based on lock state
    $: buttonState = (() => {
        if (showAreaLock && !canLockArea) {
            return "disabled";
        }
        return lockState ? "forbidden" : "normal";
    })();
</script>

{#if showAreaLock || showGroupLock}
    <ActionBarButton
        on:click={handleClick}
        classList="group/btn-lock"
        tooltipTitle={$LL.actionbar.help.lock.title()}
        tooltipDesc={$LL.actionbar.help.lock.desc()}
        disabledHelp={$openedMenuStore !== undefined || (showAreaLock && !canLockArea)}
        state={buttonState}
        dataTestId="lock-button"
        media="./static/Videos/LockBubble.mp4"
        desc={$LL.actionbar.help.lock.desc()}
    >
        {#if lockState}
            <LockIcon />
        {:else}
            <LockOpenIcon />
        {/if}
    </ActionBarButton>
{/if}
