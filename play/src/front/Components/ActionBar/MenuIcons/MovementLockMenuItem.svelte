<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { touchScreenManager } from "../../../Touch/TouchScreenManager";
    import { movementLockedStore } from "../../../Stores/MovementLockStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import LockIcon from "../../Icons/LockIcon.svelte";
    import LockOpenIcon from "../../Icons/LockOpenIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";

    // Only relevant on primarily-touch devices, where a stray tap on the canvas walks the avatar.
    const showButton = touchScreenManager.primaryTouchDevice;

    function toggleMovementLock(): void {
        analyticsClient.lockMovement();
        movementLockedStore.toggle();
    }
</script>

{#if showButton}
    <ActionBarButton
        onclick={toggleMovementLock}
        classList="group/btn-movement-lock"
        disabledHelp={$openedMenuStore !== undefined}
        state={$movementLockedStore ? "active" : "normal"}
        dataTestId="movement-lock-button"
        tooltipTitle={$LL.actionbar.help.movementLock.title()}
        tooltipDesc={$LL.actionbar.help.movementLock.desc()}
        desc={$LL.actionbar.help.movementLock.desc()}
    >
        {#if $movementLockedStore}
            <LockIcon />
        {:else}
            <LockOpenIcon />
        {/if}
    </ActionBarButton>
{/if}
