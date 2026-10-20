<script lang="ts">
    import type { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { UploadedFileKind } from "@workadventure/messages";
    import { LL } from "../../../../i18n/i18n-svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import InputRadio from "../../Input/InputRadio.svelte";
    import { IconFileMusic } from "../../Icons";
    import { audioOutput } from "../../../WebRtc/AudioOutputManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import FileUpload from "./FileUpload/FileUpload.svelte";

    interface Props {
        property: PlayAudioPropertyData;
        isArea?: boolean;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), isArea = false, onchange, onclose }: Props = $props();
    let optionAdvancedActivated = $state(false);

    // The sound is uploaded to the map-storage or linked by URL. Switching tabs changes nothing: the
    // sound is only replaced once a file is uploaded or a URL typed.
    let source: "upload" | "url" = $state(property.audioLink && !property.audioName ? "url" : "upload");
    let url = $state(property.audioName ? "" : property.audioLink);

    let HTMLAudioPlayer: HTMLAudioElement;
    let playing = $state(false);
    let errorMessage = $state("");

    function playAudio() {
        if (!property.audioLink) {
            if (HTMLAudioPlayer) HTMLAudioPlayer.pause();
            return;
        }
        HTMLAudioPlayer.pause();
        // Played from the same address as on the map, placeholders and relative links included.
        HTMLAudioPlayer.src = resolveSoundUrl(property.audioLink, gameManager.getCurrentGameScene().getMapUrl());
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
    }

    function setSound(audioLink: string, audioName: string | null) {
        stopAudio();
        property.audioLink = audioLink;
        property.audioName = audioName;
        onValueChange();
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
                    <InputRadio
                        id="audioSourceUpload-{property.id}"
                        label={$LL.mapEditor.properties.playAudio.sourceUpload()}
                        value="upload"
                        bind:group={source}
                    />
                    <InputRadio
                        id="audioSourceUrl-{property.id}"
                        label={$LL.mapEditor.properties.playAudio.sourceUrl()}
                        value="url"
                        bind:group={source}
                    />
                </div>
                <div class="flex items-end gap-1">
                    <div class="grow">
                        {#if source === "upload"}
                            <FileUpload
                                propertyId={property.id}
                                name={property.audioName}
                                kind={UploadedFileKind.Sound}
                                onupload={(name, link) => {
                                    url = "";
                                    setSound(link, name);
                                }}
                                ondeleteFile={() => setSound("", null)}
                            />
                        {:else}
                            <Input
                                id="audioLink"
                                label={$LL.mapEditor.properties.playAudio.audioLinkLabel()}
                                type="text"
                                placeholder={$LL.mapEditor.properties.playAudio.audioLinkPlaceholder()}
                                bind:value={url}
                                onchange={() => setSound(url, null)}
                            />
                        {/if}
                    </div>
                    {#if !playing}
                        <button onclick={playAudio} class="ps-1 pe-0 pb-1 text-xl"> ▶️ </button>
                    {:else}
                        <button onclick={stopAudio} class="ps-1 pe-0 pb-1 text-xl"> ⏹️ </button>
                    {/if}
                </div>
                <audio use:audioOutput class="audio-manager-audioplayer" bind:this={HTMLAudioPlayer}></audio>
            </div>
            <div class="value-input text-danger-800" class:invisible={!errorMessage}>
                ⚠️ {errorMessage}
            </div>

            {#if isArea === false}
                <InputSwitch
                    id="playForAllUsers"
                    label={$LL.mapEditor.properties.playAudio.playForAllUsersLabel()}
                    bind:value={property.playForAllUsers}
                    onchange={onValueChange}
                />
                {#if property.playForAllUsers}
                    <div class="value-input">
                        <Input
                            label={$LL.mapEditor.properties.playAudio.audibleRadiusLabel()}
                            id="audibleRadius"
                            type="number"
                            min={0}
                            placeholder={$LL.mapEditor.properties.playAudio.audibleRadiusPlaceholder()}
                            bind:value={property.audibleRadius}
                            onchange={onValueChange}
                        />
                    </div>
                {/if}
            {/if}

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
                    {#if !isArea && !property.hideButtonLabel}
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
