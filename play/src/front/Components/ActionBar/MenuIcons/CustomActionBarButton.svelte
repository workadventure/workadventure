<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import { CustomButtonActionBarDescriptor } from "../../../Stores/MenuStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { iframeListener } from "../../../Api/IframeListener";

    export let button: CustomButtonActionBarDescriptor;
    export let first: boolean | undefined = undefined;
    export let last: boolean | undefined = undefined;
    export let classList: string | undefined = undefined;

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
    on:click={() => {
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
