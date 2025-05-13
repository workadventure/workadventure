<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { silentStore } from "../../../Stores/MediaStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore, screenSharingActivatedStore } from "../../../Stores/MenuStore";

    import ScreenShareIcon from "../../Icons/ScreenShareIcon.svelte";
    import ScreenShareOffIcon from "../../Icons/ScreenShareOffIcon.svelte";
    import { isScreenSharingSupported, requestedScreenSharingState } from "../../../Stores/ScreenSharingStore";

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function screenSharingClick(): void {
        dispatch("click");
        analyticsClient.screenSharing();
        if ($silentStore) return;
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }
</script>

{#if isScreenSharingSupported()}
    <ActionBarButton
        on:click={screenSharingClick}
        classList="group/btn-screen-share"
        tooltipTitle={$LL.actionbar.help.share.title()}
        disabledHelp={$openedMenuStore !== undefined}
        state={!$screenSharingActivatedStore
            ? "disabled"
            : $requestedScreenSharingState && !$silentStore
            ? "active"
            : "normal"}
        dataTestId="screenShareButton"
        media="./static/images/screensharing.mp4"
        desc={$LL.actionbar.help.share.desc()}
    >
        {#if $requestedScreenSharingState && !$silentStore}
            <ScreenShareOffIcon />
        {:else}
            <ScreenShareIcon />
        {/if}
    </ActionBarButton>
{/if}
