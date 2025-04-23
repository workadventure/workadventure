<script lang="ts">
    import { navChat } from "../../../Chat/Stores/ChatStore";
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
    classList="group/btn-users hidden @sm/actions:flex"
    tooltipTitle={getTooltipTitle()}
    tooltipDesc={getTooltipDesc()}
    {state}
    dataTestId="user-list-button"
    disabledHelp={false}
>
    <UsersIcon />
</ActionBarButton>
