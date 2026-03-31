<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import MegaphoneIcon from "../../Icons/MegaphoneIcon.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { requestedMegaphoneStore } from "../../../Stores/MegaphoneStore";
    import { stopMegaphoneLive } from "./megaphoneActions";
</script>

<ActionBarButton
    on:click={stopMegaphoneLive}
    classList="group/btn-megaphone"
    tooltipTitle={$LL.actionbar.help.megaphone.title()}
    tooltipDesc={$LL.actionbar.help.megaphone.desc()}
    state={$requestedMegaphoneStore ? "forbidden" : "normal"}
    dataTestId="Megaphone-button"
    desc={$LL.actionbar.help.megaphone.desc()}
>
    <MegaphoneIcon />
</ActionBarButton>
