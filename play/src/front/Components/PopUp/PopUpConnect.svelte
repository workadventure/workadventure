<script lang="ts">
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import PopUpContainer from "./PopUpContainer.svelte";

    function goToLogin() {
        analyticsClient.login();
        window.location.href = "/login";
        popupStore.removePopup("popupConnect");
    }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {$LL.mapEditor.entityEditor.errors.dragNotConnected()}
    <svelte:fragment slot="buttons">
        <button class="btn btn-secondary btn-sm w-full max-w-96 justify-center" on:click={goToLogin}>
            {$LL.actionbar.login()}
        </button>
        <button
            class="btn btn-outline btn-sm w-full max-w-96 justify-center"
            on:click={() => popupStore.removePopup("popupConnect")}
        >
            {$LL.actionbar.cancel()}
        </button>
    </svelte:fragment>
</PopUpContainer>
