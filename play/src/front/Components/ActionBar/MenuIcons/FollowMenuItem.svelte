<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import FollowIcon from "../../Icons/FollowIcon.svelte";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
    import { followRoleStore, followStateStore, followUsersStore } from "../../../Stores/FollowStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { openedMenuStore } from "../../../Stores/MenuStore";

    function followClick() {
        switch ($followStateStore) {
            case "off":
                gameManager.getCurrentGameScene().connection?.emitFollowRequest();
                followRoleStore.set("leader");
                followStateStore.set("active");
                break;
            case "requesting":
            case "active":
            case "ending":
                gameManager.getCurrentGameScene().connection?.emitFollowAbort();
                followUsersStore.stopFollowing();
                break;
        }
    }
</script>

<ActionBarButtonWrapper classList="group/btn-follow">
    <ActionBarIconButton
        on:click={() => {
            analyticsClient.follow();
            followClick();
        }}
        tooltipTitle={$followStateStore === "active"
            ? $LL.actionbar.help.unfollow.title()
            : $LL.actionbar.help.follow.title()}
        tooltipDesc={$followStateStore === "active"
            ? $LL.actionbar.help.unfollow.desc()
            : $LL.actionbar.help.follow.desc()}
        disabledHelp={$openedMenuStore !== undefined}
        state={$followStateStore === "active" ? "active" : "normal"}
    >
        <FollowIcon />
    </ActionBarIconButton>
</ActionBarButtonWrapper>
