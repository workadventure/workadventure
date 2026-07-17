<script lang="ts">
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import Button from "../UI/Button.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    function goToLogin() {
        analyticsClient.login();
        window.location.href = "/login";
        popupStore.removePopup("popupConnect");
    }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {$LL.mapEditor.entityEditor.errors.dragNotConnected()}
    {#snippet buttons()}
        <Button variant="secondary" size="sm" class="w-full max-w-96" onclick={goToLogin}>
            {$LL.actionbar.login()}
        </Button>
        <Button size="sm" class="btn-outline w-full max-w-96" onclick={() => popupStore.removePopup("popupConnect")}>
            {$LL.actionbar.cancel()}
        </Button>
    {/snippet}
</PopUpContainer>
