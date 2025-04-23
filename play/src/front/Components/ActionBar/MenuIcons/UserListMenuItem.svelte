<script lang="ts">
    import { navChat, userListTooltipStore } from "../../../Chat/Stores/ChatStore";
    import UsersIcon from "../../Icons/UsersIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { userIsAdminStore } from "../../../Stores/GameStore";

    export let state: "normal" | "active" | "forbidden" | "disabled" = "normal";

    function toggleUserList() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }
        chatVisibilityStore.set(!$chatVisibilityStore);
        navChat.switchToUserList();
    }

    function getTooltipTitle() {
        if (!(state === "disabled")) {
            return $LL.actionbar.help.users.title();
        } else {
            if (userIsAdminStore) {
                return $LL.actionbar.help.users.disabledAdmin.title();
            } else {
                return $LL.actionbar.help.users.disabled.title();
            }
        }
    }

    function getTooltipDesc() {
        if (!(state === "disabled")) {
            return $LL.actionbar.help.users.desc();
        } else {
            if (userIsAdminStore) {
                return $LL.actionbar.help.users.disabledAdmin.desc();
            } else {
                return $LL.actionbar.help.users.disabled.desc();
            }
        }
    }
</script>

<ActionBarButton
    on:click={toggleUserList}
    classList="group/btn-users hidden @sm/actions:flex {$userListTooltipStore ? 'z-[9999]' : ''}"
    tooltipTitle={getTooltipTitle()}
    desc={getTooltipDesc()}
    {state}
    dataTestId="user-list-button"
    disabledHelp={false}
    media="./static/Videos/UserList.mp4"
    showToolTipCondition={$userListTooltipStore}
    toolTipDelay={$userListTooltipStore ? 0 : 500}
>
    <UsersIcon />
    <div
        class=" absolute w-full h-full z-50 rounded-md bg-white/50 top-0 left-0  {$userListTooltipStore
            ? 'pulse'
            : 'hidden'}"
    />
</ActionBarButton>

<style>
    .pulse {
        animation: pulse 0.8s infinite ease-in-out;
    }
    @keyframes pulse {
        75%,
        100% {
            transform: scale(1.2);
            opacity: 0;
        }
    }
</style>
