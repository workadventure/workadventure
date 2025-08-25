<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import audioSvg from "../../images/audio-white.svg";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: PlayAudioPropertyData;
    export let isArea = false;
    let optionAdvancedActivated = false;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
        audioLink: PlayAudioPropertyData;
    }>();

    let HTMLAudioPlayer: HTMLAudioElement;
    let playing = false;
    let errorMessage = "";

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
                    errorMessage = $LL.mapEditor.properties.audioProperties.error() + ": " + error.message;
                } else {
                    errorMessage = $LL.mapEditor.properties.audioProperties.error();
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
        dispatch("change");
        // Fixme: this is a hack to force the map editor to update the property
        dispatch("audioLink", property);
    }

    function onRangeChange() {
        if (property.volume !== undefined) {
            HTMLAudioPlayer.volume = property.volume;
        }
        onValueChange();
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <img class="w-6 me-2" src={audioSvg} alt={$LL.mapEditor.properties.audioProperties.description()} />
        {$LL.mapEditor.properties.audioProperties.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <div class="flex">
                <Input
                    id="audioLink"
                    label={$LL.mapEditor.properties.audioProperties.audioLinkLabel()}
                    type="text"
                    placeholder={$LL.mapEditor.properties.audioProperties.audioLinkPlaceholder()}
                    bind:value={property.audioLink}
                    onChange={onValueChange}
                />
                {#if !playing}
                    <button on:click={playAudio} class="mt-7 ps-1 pe-0 text-xl"> ▶️ </button>
                {:else}
                    <button on:click={stopAudio} class="mt-7 ps-1 pe-0 text-xl"> ⏹️ </button>
                {/if}
            </div>
            <audio class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer} />
        </div>
        <div class="value-input text-danger-500" class:invisible={!errorMessage}>
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
                            label={$LL.mapEditor.properties.linkProperties.triggerMessage()}
                            id="triggerMessage"
                            type="text"
                            placeholder={$LL.trigger.object()}
                            bind:value={property.triggerMessage}
                            onChange={onValueChange}
                        />
                    </div>
                {/if}
                <div class="value-input">
                    <RangeSlider
                        label={$LL.mapEditor.properties.audioProperties.volumeLabel()}
                        unit=""
                        id="volume"
                        min={0}
                        max={1}
                        step={0.05}
                        bind:value={property.volume}
                        onChange={onRangeChange}
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
                            onChange={onValueChange}
                        />
                    </div>
                {/if}
            </div>
        {/if}
    </span>
</PropertyEditorBase>
