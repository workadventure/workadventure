<script lang="ts">
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import MegaphoneIcon from "../../Icons/MegaphoneIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { requestedMegaphoneStore, megaphoneSpaceStore } from "../../../Stores/MegaphoneStore";
    import { streamingMegaphoneStore } from "../../../Stores/MediaStore";
</script>

<ActionBarButton
    on:click={() => {
        analyticsClient.stopMegaphone();
        $megaphoneSpaceStore?.stopStreaming();
        requestedMegaphoneStore.set(false);
        streamingMegaphoneStore.set(false);
    }}
    classList="group/btn-megaphone"
    tooltipTitle={$LL.actionbar.help.megaphone.title()}
    tooltipDesc={$LL.actionbar.help.megaphone.desc()}
    state={$requestedMegaphoneStore ? "forbidden" : "normal"}
    dataTestId="Megaphone-button"
    desc={$LL.actionbar.help.megaphone.desc()}
>
    <MegaphoneIcon />
</ActionBarButton>
