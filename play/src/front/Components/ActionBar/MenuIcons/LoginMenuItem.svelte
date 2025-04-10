<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { IconUserCircle } from "@wa-icons";

    export let first: boolean | undefined = undefined;
    export let last: boolean | undefined = undefined;
    export let classList: string | undefined = undefined;

    function goToLogin() {
        analyticsClient.login();
        window.location.href = "/login";
    }
</script>

<ActionBarButton
    label={$LL.actionbar.login()}
    state="active"
    hideIconInActionBar={true}
    on:click={goToLogin}
    {first}
    {last}
    {classList}
>
    <IconUserCircle />
</ActionBarButton>
