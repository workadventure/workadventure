<script lang="ts">
    import TextGlobalMessage from "./TextGlobalMessage.svelte";
    import AudioGlobalMessage from "./AudioGlobalMessage.svelte";
    import LL from "../../i18n/i18n-svelte";

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

<div class="global-message-main">
    <div class="global-message-subOptions">
        <section>
            <button
                type="button"
                class="nes-btn {inputSendTextActive ? 'is-disabled' : ''}"
                on:click|preventDefault={activateInputText}>{$LL.menu.globalMessage.text()}</button
            >
        </section>
        <section>
            <button
                type="button"
                class="nes-btn {uploadAudioActive ? 'is-disabled' : ''}"
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
    <div class="global-message-footer">
        <label>
            <input type="checkbox" class="nes-checkbox is-dark nes-pointer" bind:checked={broadcastToWorld} />
            <span>{$LL.menu.globalMessage.warning()}</span>
        </label>
        <section>
            <button class="nes-btn is-primary" on:click|preventDefault={send}>{$LL.menu.globalMessage.send()}</button>
        </section>
    </div>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    div.global-message-main {
        height: calc(100% - 50px);
        display: grid;
        grid-template-rows: 15% 65% 20%;

        div.global-message-subOptions {
            display: grid;
            grid-template-columns: 50% 50%;
            margin-bottom: 20px;

            section {
                display: flex;
                justify-content: center;
                align-items: center;
            }
        }

        div.global-message-footer {
            margin-bottom: 10px;

            display: grid;
            grid-template-rows: 50% 50%;

            section {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            label {
                margin: 10px;
                display: flex;
                justify-content: center;
                align-items: center;

                span {
                    font-family: "Press Start 2P";
                }
            }
        }
    }

    @include media-breakpoint-up(md) {
        .global-message-content {
            height: calc(100% - 5px);
        }
        .global-message-footer {
            margin-bottom: 0;

            label {
                width: calc(100% - 10px);
            }
        }
    }
</style>
