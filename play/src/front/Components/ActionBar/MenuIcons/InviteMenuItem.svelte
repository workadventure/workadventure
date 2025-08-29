<script lang="ts">
    import { inviteUserActivated, showMenuItem, SubMenusInterface } from "../../../Stores/MenuStore";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ShareIcon from "../../Icons/ShareIcon.svelte";

    export let first: boolean | undefined = undefined;
    export let last: boolean | undefined = undefined;
    export let classList: string | undefined = undefined;

    function showInviteScreen() {
        analyticsClient.openInvite();
        showMenuItem(SubMenusInterface.invite);
    }
</script>

{#if $inviteUserActivated}
    <ActionBarButton
        label={$LL.menu.invite.share()}
        boldLabel={true}
        hideIconInActionBar={false}
        on:click={showInviteScreen}
        bgColor="rgba(255, 255, 255, 0.1)"
        {first}
        {last}
        {classList}
    >
        <ShareIcon strokeWidth="stroke-[1.5]" />
    </ActionBarButton>
{/if}
