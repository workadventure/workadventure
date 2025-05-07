<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import FollowIcon from "../../Icons/FollowIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
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

<ActionBarButton
    on:click={() => {
        analyticsClient.follow();
        followClick();
    }}
    classList="group/btn-follow"
    tooltipTitle={$followStateStore === "active"
        ? $LL.actionbar.help.unfollow.title()
        : $LL.actionbar.help.follow.title()}
    disabledHelp={$openedMenuStore !== undefined}
    state={$followStateStore === "active" ? "active" : "normal"}
    media="./static/Videos/Follow.mp4"
    desc={$followStateStore === "active" ? $LL.actionbar.help.unfollow.desc() : $LL.actionbar.help.follow.desc()}
>
    <FollowIcon />
</ActionBarButton>
