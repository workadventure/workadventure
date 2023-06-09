<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import TextGlobalMessage from "./TextGlobalMessage.svelte";
    import AudioGlobalMessage from "./AudioGlobalMessage.svelte";

    let handleSendText: { sendTextMessage(broadcast: boolean): void };
    let handleSendAudio: { sendAudioMessage(broadcast: boolean): Promise<void> };

    let inputSendTextActive = true;
    let uploadAudioActive = !inputSendTextActive;
    let broadcastToWorld = false;

    function activateInputText() {
        inputSendTextActive = true;
        uploadAudioActive = false;
    }

    function activateUploadAudio() {
        inputSendTextActive = false;
        uploadAudioActive = true;
    }

    async function send(): Promise<void> {
        if (inputSendTextActive) {
            return handleSendText.sendTextMessage(broadcastToWorld);
        }
        if (uploadAudioActive) {
            return handleSendAudio.sendAudioMessage(broadcastToWorld);
        }
    }
</script>

<div>
    <div class="global-message-subOptions">
        <section class="tw-flex tw-justify-center">
            <button
                type="button"
                class=" {inputSendTextActive ? 'light' : 'outline'}"
                on:click|preventDefault={activateInputText}>{$LL.menu.globalMessage.text()}</button
            >
            <button
                type="button"
                class=" {uploadAudioActive ? 'light' : 'outline'}"
                on:click|preventDefault={activateUploadAudio}>{$LL.menu.globalMessage.audio()}</button
            >
        </section>
    </div>
    <div class="global-message-content">
        {#if inputSendTextActive}
            <TextGlobalMessage bind:handleSending={handleSendText} />
        {/if}
        {#if uploadAudioActive}
            <AudioGlobalMessage bind:handleSending={handleSendAudio} />
        {/if}
    </div>
    <div>
        <label>
            <input type="checkbox" bind:checked={broadcastToWorld} />
            <span>{$LL.menu.globalMessage.warning()}</span>
        </label>
        <section class="centered-column">
            <button class="light" on:click|preventDefault={send}>{$LL.menu.globalMessage.send()}</button>
        </section>
    </div>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
