<script lang="ts">
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import UsersIcon from "../../Icons/UsersIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";

    function toggleUserList() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
        navChat.switchToUserList();
    }
</script>

<ActionBarButton
    on:click={toggleUserList}
    classList="group/btn-users"
    tooltipTitle={$LL.actionbar.help.users.title()}
    tooltipDesc={$LL.actionbar.help.users.desc()}
    state={"normal"}
    dataTestId="user-list-button"
    disabledHelp={false}
>
    <UsersIcon />
</ActionBarButton>
