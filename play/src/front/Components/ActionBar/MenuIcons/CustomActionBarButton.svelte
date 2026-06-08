<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import type { CustomButtonActionBarDescriptor } from "../../../Stores/MenuStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { iframeListener } from "../../../Api/IframeListener";

    interface Props {
        button: CustomButtonActionBarDescriptor;
        first?: boolean;
        last?: boolean;
        classList?: string;
    }

    let { button, first = undefined, last = undefined, classList = undefined }: Props = $props();

    function buttonActionBarTrigger(button: CustomButtonActionBarDescriptor) {
        analyticsClient.clickOnCustomButton(button.id, button.label, button.tooltipTitle, button.imageSrc);
        return iframeListener.sendButtonActionBarTriggered(button.id);
    }
</script>

<ActionBarButton
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
