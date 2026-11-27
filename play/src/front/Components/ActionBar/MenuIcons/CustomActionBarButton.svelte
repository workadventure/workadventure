<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import type { CustomButtonActionBarDescriptor } from "../../../Stores/MenuStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { iframeListener } from "../../../Api/IframeListener";
    import { onboarding } from "../../../Onboarding/OnboardingAnchors";

    interface Props {
        button: CustomButtonActionBarDescriptor;
        first?: boolean;
        last?: boolean;
        classList?: string;
    }

    let { button, first = undefined, last = undefined, classList = undefined }: Props = $props();

    function buttonActionBarTrigger(button: CustomButtonActionBarDescriptor) {
        analyticsClient.trackAdminEvent("custom_button.clicked", { id: button.id, label: button.label });
        return iframeListener.sendButtonActionBarTriggered(button.id);
    }
</script>

<!-- World onboarding items can point at the buttons map scripts add. -->
<ActionBarButton
    {@attach onboarding(`actionBar.custom.${button.id}`)}
    label={button.label}
    tooltipTitle={button.tooltipTitle}
    tooltipDesc={button.tooltipDesc}
    bgColor={button.bgColor}
    textColor={button.textColor}
    hasImage={!!button.imageSrc}
    isGradient={button.isGradient}
    onclick={() => {
        buttonActionBarTrigger(button);
    }}
    {first}
    {last}
    {classList}
>
    {#if button.imageSrc}
        <img draggable="false" src={button.imageSrc} alt={button.tooltipTitle} class="h-6" />
    {/if}
</ActionBarButton>
