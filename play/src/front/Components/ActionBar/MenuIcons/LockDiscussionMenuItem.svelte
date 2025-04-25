<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import LockIcon from "../../Icons/LockIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LockOpenIcon from "../../Icons/LockOpenIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { currentPlayerGroupLockStateStore } from "../../../Stores/CurrentPlayerGroupStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    function lockClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }
</script>

<ActionBarButton
    on:click={() => {
        analyticsClient.lockDiscussion();
        lockClick();
    }}
    classList="group/btn-lock"
    tooltipTitle={$LL.actionbar.help.lock.title()}
    tooltipDesc={$LL.actionbar.help.lock.desc()}
    disabledHelp={$openedMenuStore !== undefined}
    state={$currentPlayerGroupLockStateStore ? "forbidden" : "normal"}
    dataTestId="lock-button"
    media="./static/Videos/LockBubble.mp4"
    desc={$LL.actionbar.help.lock.desc()}
>
    {#if $currentPlayerGroupLockStateStore}
        <LockIcon />
    {:else}
        <LockOpenIcon />
    {/if}
</ActionBarButton>
