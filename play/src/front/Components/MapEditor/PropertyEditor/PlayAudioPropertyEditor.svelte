<script lang="ts">
    import type { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { IconFileMusic } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: PlayAudioPropertyData;
        isArea?: boolean;
        onchange?: () => void;
        onclose?: () => void;
        onaudiolink?: (property: PlayAudioPropertyData) => void;
    }

    let { property = $bindable(), isArea = false, onchange, onclose, onaudiolink }: Props = $props();
    let optionAdvancedActivated = $state(false);

    let HTMLAudioPlayer: HTMLAudioElement;
    let playing = $state(false);
    let errorMessage = $state("");

    function playAudio() {
        if (!property.audioLink) {
            if (HTMLAudioPlayer) HTMLAudioPlayer.pause();
            return;
        }
        HTMLAudioPlayer.pause();
        HTMLAudioPlayer.src = property.audioLink;
        if (property.volume !== undefined) {
            HTMLAudioPlayer.volume = property.volume;
        }

        HTMLAudioPlayer.onended = () => {
            playing = false;
        };

        errorMessage = "";

        HTMLAudioPlayer.play()
            .then(() => {
                playing = true;
            })
            .catch((error) => {
                playing = false;
                if (error instanceof DOMException) {
                    errorMessage = $LL.mapEditor.properties.playAudio.error() + ": " + error.message;
                } else {
                    errorMessage = $LL.mapEditor.properties.playAudio.error();
                }
                console.error(error);
            });
    }

    function stopAudio() {
        if (HTMLAudioPlayer) HTMLAudioPlayer.pause();
        playing = false;
    }

    function onValueChange() {
        errorMessage = "";
        onchange?.();
        // Fixme: this is a hack to force the map editor to update the property
        onaudiolink?.(property);
    }

    function onRangeChange() {
        if (property.volume !== undefined) {
            HTMLAudioPlayer.volume = property.volume;
        }
        onValueChange();
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconFileMusic font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.playAudio.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <div class="value-input">
                <div class="flex">
                    <Input
                        id="audioLink"
                        label={$LL.mapEditor.properties.playAudio.audioLinkLabel()}
                        type="text"
                        placeholder={$LL.mapEditor.properties.playAudio.audioLinkPlaceholder()}
                        bind:value={property.audioLink}
                        onchange={onValueChange}
                    />
                    {#if !playing}
                        <button onclick={playAudio} class="mt-7 ps-1 pe-0 text-xl"> ▶️ </button>
                    {:else}
                        <button onclick={stopAudio} class="mt-7 ps-1 pe-0 text-xl"> ⏹️ </button>
                    {/if}
                </div>
                <audio class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer}></audio>
            </div>
            <div class="value-input text-danger-800" class:invisible={!errorMessage}>
                ⚠️ {errorMessage}
            </div>

            <InputSwitch
                id="advancedOption"
                label={$LL.mapEditor.properties.advancedOptions()}
                bind:value={optionAdvancedActivated}
            />

            {#if optionAdvancedActivated}
                <div class:active={optionAdvancedActivated} class="advanced-option">
                    {#if isArea === false}
                        <div class="value-input flex flex-col">
                            <Input
                                label={$LL.mapEditor.properties.openWebsite.triggerMessage()}
                                id="triggerMessage"
                                type="text"
                                placeholder={$LL.trigger.object()}
                                bind:value={property.triggerMessage}
                                onchange={onValueChange}
                            />
                        </div>
                    {/if}
                    <div class="value-input">
                        <RangeSlider
                            label={$LL.mapEditor.properties.playAudio.volumeLabel()}
                            unit=""
                            id="volume"
                            min={0}
                            max={1}
                            step={0.05}
                            bind:value={property.volume}
                            onchange={onRangeChange}
                            buttonShape="square"
                        />
                    </div>
                    {#if !property.hideButtonLabel}
                        <div class="value-input">
                            <Input
                                label={$LL.mapEditor.entityEditor.buttonLabel()}
                                id="audioButtonLabel"
                                type="text"
                                bind:value={property.buttonLabel}
                                onchange={onValueChange}
                            />
                        </div>
                    {/if}
                </div>
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>
