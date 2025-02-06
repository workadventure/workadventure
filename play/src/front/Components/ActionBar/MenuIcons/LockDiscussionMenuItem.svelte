<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import LockIcon from "../../Icons/LockIcon.svelte";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import LockOpenIcon from "../../Icons/LockOpenIcon.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { currentPlayerGroupLockStateStore } from "../../../Stores/CurrentPlayerGroupStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    function lockClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }
</script>

<ActionBarButtonWrapper classList="group/btn-lock">
    <ActionBarIconButton
        on:click={() => {
            analyticsClient.lockDiscussion();
            lockClick();
        }}
        tooltipTitle={$LL.actionbar.help.lock.title()}
        tooltipDesc={$LL.actionbar.help.lock.desc()}
        disabledHelp={$openedMenuStore !== undefined}
        state={$currentPlayerGroupLockStateStore ? "forbidden" : "normal"}
        dataTestId="lock-button"
    >
        {#if $currentPlayerGroupLockStateStore}
            <LockIcon />
        {:else}
            <LockOpenIcon />
        {/if}
    </ActionBarIconButton>
</ActionBarButtonWrapper>
