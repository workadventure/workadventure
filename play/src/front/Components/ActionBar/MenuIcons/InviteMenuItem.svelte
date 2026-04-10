<script lang="ts">
    import { inviteUserActivated } from "../../../Stores/MenuStore";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ShareIcon from "../../Icons/ShareIcon.svelte";
    import GuestSubMenu from "../../Menu/GuestSubMenu.svelte";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";

    export let first: boolean | undefined = undefined;
    export let last: boolean | undefined = undefined;
    export let classList: string | undefined = undefined;

    let displayTooltip = true;
    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = undefined;

    function showInviteScreen() {
        if (!displayTooltip) {
            closeFloatingUi?.();
            closeFloatingUi = undefined;
        } else if (triggerElement) {
            analyticsClient.openInvite();
            closeFloatingUi = showFloatingUi(
                triggerElement,
                GuestSubMenu,
                {},
                {
                    placement: "bottom",
                },
                12,
                true
            );
        }
        displayTooltip = !displayTooltip;
    }
</script>

{#if $inviteUserActivated}
    <ActionBarButton
        label={$LL.menu.invite.share()}
        boldLabel={true}
        hideIconInActionBar={false}
        on:click={showInviteScreen}
        bind:wrapperDiv={triggerElement}
        bgColor="rgba(255, 255, 255, 0.1)"
        {first}
        {last}
        {classList}
    >
        <ShareIcon strokeWidth="stroke-[1.5]" />
    </ActionBarButton>
{/if}
