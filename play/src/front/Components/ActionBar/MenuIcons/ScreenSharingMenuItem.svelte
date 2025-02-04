<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarIconButton from "../ActionBarIconButton.svelte";
    import ActionBarButtonWrapper from "../ActionBarButtonWrapper.svelte";
    import { silentStore } from "../../../Stores/MediaStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore, screenSharingActivatedStore } from "../../../Stores/MenuStore";

    import ScreenShareIcon from "../../Icons/ScreenShareIcon.svelte";
    import ScreenShareOffIcon from "../../Icons/ScreenShareOffIcon.svelte";
    import { requestedScreenSharingState } from "../../../Stores/ScreenSharingStore";

    function screenSharingClick(): void {
        analyticsClient.screenSharing();
        if ($silentStore) return;
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }
</script>

<ActionBarButtonWrapper classList="group/btn-screen-share">
    <ActionBarIconButton
        on:click={screenSharingClick}
        tooltipTitle={$LL.actionbar.help.share.title()}
        tooltipDesc={$LL.actionbar.help.share.desc()}
        disabledHelp={$openedMenuStore !== undefined}
        state={!$screenSharingActivatedStore
            ? "disabled"
            : $requestedScreenSharingState && !$silentStore
            ? "active"
            : "normal"}
        dataTestId="screenShareButton"
    >
        {#if $requestedScreenSharingState && !$silentStore}
            <ScreenShareOffIcon />
        {:else}
            <ScreenShareIcon />
        {/if}
    </ActionBarIconButton>
</ActionBarButtonWrapper>
