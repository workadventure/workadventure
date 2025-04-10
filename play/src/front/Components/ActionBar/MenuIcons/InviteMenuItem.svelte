<script lang="ts">
    import { inviteUserActivated, showMenuItem, SubMenusInterface } from "../../../Stores/MenuStore";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { IconShare3 } from "@wa-icons";

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
        label={$LL.menu.sub.invite()}
        hideIconInActionBar={true}
        on:click={showInviteScreen}
        {first}
        {last}
        {classList}
    >
        <IconShare3 />
    </ActionBarButton>
{/if}
