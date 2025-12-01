<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { isSpeakerStore, silentStore } from "../../../Stores/MediaStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore, screenSharingActivatedStore } from "../../../Stores/MenuStore";

    import { IconScreenShare, IconScreenShareOff } from "@wa-icons";
    import { isScreenSharingSupported, requestedScreenSharingState } from "../../../Stores/ScreenSharingStore";

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function screenSharingClick(): void {
        dispatch("click");
        analyticsClient.screenSharing();
        if ($silentStore && !$isSpeakerStore) return;
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
            <IconScreenShareOff font-size="20" class="text-white" />
        {:else}
            <IconScreenShare font-size="20" class="text-white" />
        {/if}
    </ActionBarButton>
{/if}
