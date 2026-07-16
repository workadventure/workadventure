<script lang="ts">
    import { onDestroy } from "svelte";
    import { inviteUserActivated } from "../../../Stores/MenuStore";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ShareIcon from "../../Icons/ShareIcon.svelte";
    import GuestSubMenu from "../../Menu/GuestSubMenu.svelte";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";

    interface Props {
        first?: boolean;
        last?: boolean;
        classList?: string;
    }

    let { first = undefined, last = undefined, classList = undefined }: Props = $props();

    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = $state(undefined);

    function closeInviteMenu(): void {
        // Reset the handle before closing: close() calls back into onClose synchronously.
        const close = closeFloatingUi;
        closeFloatingUi = undefined;
        close?.();
    }

    function showInviteScreen() {
        if (closeFloatingUi !== undefined) {
            closeInviteMenu();
            return;
        }
        if (triggerElement === undefined) {
            return;
        }
        analyticsClient.openInvite();
        closeFloatingUi = showFloatingUi(
            triggerElement,
            GuestSubMenu,
            {},
            {
                placement: "bottom",
            },
            12,
            true,
            true,
            () => {
                closeFloatingUi = undefined;
            },
        );
    }

    // The popup is rendered by FloatingUiPopupList at the root of the app, so it outlives this
    // component. The action bar is unmounted whenever the chat or the map editor leaves less than
    // 285px of room, which would otherwise strand the popup with no way to close it.
    onDestroy(closeInviteMenu);
</script>

{#if $inviteUserActivated}
    <ActionBarButton
        label={$LL.menu.invite.share()}
        boldLabel={true}
        hideIconInActionBar={false}
        onclick={showInviteScreen}
        bind:wrapperDiv={triggerElement}
        bgColor="rgba(255, 255, 255, 0.1)"
        {first}
        {last}
        {classList}
    >
        <ShareIcon strokeWidth="stroke-[1.5]" />
    </ActionBarButton>
{/if}
