<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import TextGlobalMessage, { type TextGlobalMessageHandle } from "./TextGlobalMessage.svelte";
    import AudioGlobalMessage, { type AudioGlobalMessageHandle } from "./AudioGlobalMessage.svelte";

    let handleSendText: TextGlobalMessageHandle | undefined = $state();
    let handleSendAudio: AudioGlobalMessageHandle | undefined = $state();

    let inputSendTextActive = $state(true);
    let uploadAudioActive = $state((() => !inputSendTextActive)());
    let broadcastToWorld = $state(false);

    function activateInputText() {
        inputSendTextActive = true;
        uploadAudioActive = false;
    }

    function activateUploadAudio() {
        inputSendTextActive = false;
        uploadAudioActive = true;
    }

    function send(): void {
        if (inputSendTextActive) {
            handleSendText?.sendTextMessage(broadcastToWorld);
        } else if (uploadAudioActive) {
            handleSendAudio?.sendAudioMessage(broadcastToWorld);
        }
    }
</script>

<div>
    <div class="global-message-subOptions mb-8">
        <section class="flex border border-solid border-white/20 pl-4">
            <button
                type="button"
                class="py-6 px-12 text-lg bold relative {inputSendTextActive
                    ? "after:content-[''] after:absolute after:w-full after:h-2 after:bg-secondary after:-bottom-[4px] after:left-0 after:rounded-lg"
                    : 'opacity-50'}"
                onclick={(event) => {
                    event.preventDefault();
                    activateInputText();
                }}
            >
                {$LL.menu.globalMessage.text()}
            </button>
            <button
                type="button"
                class="py-6 px-12 text-lg bold relative {uploadAudioActive
                    ? "after:content-[''] after:absolute after:w-full after:h-2 after:bg-secondary after:-bottom-[4px] after:left-0 after:rounded-lg"
                    : 'opacity-50'}"
                onclick={(event) => {
                    event.preventDefault();
                    activateUploadAudio();
                }}
            >
                {$LL.menu.globalMessage.audio()}
            </button>
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
            <button
                class="light"
                onclick={(event) => {
                    event.preventDefault();
                    send();
                }}
            >
                {$LL.menu.globalMessage.send()}
            </button>
        </section>
    </div>
</div>
