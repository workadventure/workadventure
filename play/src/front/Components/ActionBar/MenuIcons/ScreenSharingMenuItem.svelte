<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { openedMenuStore, screenSharingActivatedStore } from "../../../Stores/MenuStore";

    import ScreenShareIcon from "../../Icons/ScreenShareIcon.svelte";
    import ScreenShareOffIcon from "../../Icons/ScreenShareOffIcon.svelte";
    import {
        isScreenSharingSupported,
        requestedScreenSharingState,
        screenSharingCanBeRequestedStore,
    } from "../../../Stores/ScreenSharingStore";
    import { getScreenSharingButtonState } from "./ScreenSharingMenuRules";

    interface Props {
        onclick?: () => void;
    }

    let { onclick }: Props = $props();

    function screenSharingClick(): void {
        if (!$screenSharingCanBeRequestedStore) return;

        onclick?.();
        analyticsClient.screenSharing();
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }

    let buttonState = $derived(
        getScreenSharingButtonState({
            canBeRequested: $screenSharingCanBeRequestedStore,
            requested: $requestedScreenSharingState,
            screenSharingActivated: $screenSharingActivatedStore,
        }),
    );
</script>

{#if isScreenSharingSupported()}
    <ActionBarButton
        onclick={screenSharingClick}
        classList="group/btn-screen-share"
        tooltipTitle={$LL.actionbar.help.share.title()}
        disabledHelp={$openedMenuStore !== undefined}
        state={buttonState}
        dataTestId="screenShareButton"
        media="./static/images/screensharing.mp4"
        desc={$LL.actionbar.help.share.desc()}
    >
        {#if $requestedScreenSharingState && $screenSharingCanBeRequestedStore}
            <ScreenShareOffIcon />
        {:else}
            <ScreenShareIcon />
        {/if}
    </ActionBarButton>
{/if}
