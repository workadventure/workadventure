<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { IconUserCircle } from "$lib/Components/Icons.ts";

    export let first: boolean | undefined = undefined;
    export let last: boolean | undefined = undefined;

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
>
    <IconUserCircle />
</ActionBarButton>
