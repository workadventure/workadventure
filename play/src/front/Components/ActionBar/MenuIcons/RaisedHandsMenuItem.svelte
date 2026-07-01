<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import AdminPanIcon from "../../Icons/AdminPanIcon.svelte";
    import RaisedHandsPanel from "../../Video/RaisedHandsPanel.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";

    let open = $state(false);

    const [floatingUiRef, floatingUiContent] = createFloatingUiActions({ placement: "bottom-start" }, 8);
</script>

<ActionBarButton
    onclick={() => (open = !open)}
    classList="group/btn-raised-hands"
    state={open ? "active" : "normal"}
    dataTestId="raised-hands-panel-button"
    tooltipTitle={$LL.actionbar.raisedHands.title()}
    desc={$LL.actionbar.raisedHands.help()}
    action={floatingUiRef}
>
    <AdminPanIcon
        strokeColor={open ? "stroke-contrast fill-white" : "stroke-white fill-transparent"}
        hover="group-hover/btn-raised-hands:fill-white"
    />
</ActionBarButton>
{#if open}
    <div use:floatingUiContent class="absolute z-50">
        <RaisedHandsPanel />
    </div>
{/if}
