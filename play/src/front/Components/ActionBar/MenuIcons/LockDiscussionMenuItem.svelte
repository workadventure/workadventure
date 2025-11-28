<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { IconLock } from "@wa-icons";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { IconLockOpen } from "../../Icons";
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
        <IconLock font-size="20" class="text-white" />
    {:else}
        <IconLockOpen font-size="20" class="text-white" />
    {/if}
</ActionBarButton>
