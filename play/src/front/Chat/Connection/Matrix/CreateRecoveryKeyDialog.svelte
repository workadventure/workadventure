<script lang="ts">
    import type { CryptoApi } from "matrix-js-sdk";
    import type { GeneratedSecretStorageKey } from "matrix-js-sdk/lib/crypto-api";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { IconFileDownload } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        crypto: CryptoApi;
        processCallback: (generatedSecretStorageKey: GeneratedSecretStorageKey | undefined) => void;
    }

    let { isOpen, crypto, processCallback }: Props = $props();

    let passphraseInput: string | undefined = $state();
    let generatedSecretStorageKey: GeneratedSecretStorageKey | undefined = $state();
    let error = $state(false);
    let isPrivateKeyDownloaded = $state(false);

    async function generateRecoveryKey(passphrase: string | undefined) {
        if (passphrase === undefined) {
            return;
        }
        try {
            generatedSecretStorageKey = await crypto.createRecoveryKeyFromPassphrase(passphrase);
        } catch (e) {
            console.error("Something went wrong on generateRecoveryKeyFromPassphrase : ", e);
            error = true;
        }
    }

    function closeModalAndContinueToWorkAdventure() {
        processCallback(generatedSecretStorageKey);
        modals.close();
    }

    onBeforeClose(() => {
        processCallback(generatedSecretStorageKey);
    });

    function downloadPrivateKeyFile() {
        const a = document.createElement("a");
        a.href =
            "data:text/plain;charset=utf-8," + encodeURIComponent(generatedSecretStorageKey?.encodedPrivateKey ?? "");

        //TODO : fileName traduction
        a.setAttribute("download", "private_key.txt");
        a.click();

        if (generatedSecretStorageKey?.encodedPrivateKey) {
            navigator.clipboard
                .writeText(generatedSecretStorageKey.encodedPrivateKey)
                .catch((error) => console.error("Error on downloadPrivateKeyFile : ", error));
        }

        isPrivateKeyDownloaded = true;
    }

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.e2ee.createRecoveryKey.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div>
            <p>{$LL.chat.e2ee.createRecoveryKey.description()}</p>
            <input
                data-testid="passphraseInput"
                class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                bind:value={passphraseInput}
                onfocusin={focusChatInput}
                onfocusout={unfocusChatInput}
            />
            {#if generatedSecretStorageKey?.encodedPrivateKey}
                <p>{$LL.chat.e2ee.createRecoveryKey.privateKeyDescription()}</p>
                <div class="flex justify-between">
                    <p class="text-green-500 m-0 content-center">{generatedSecretStorageKey.encodedPrivateKey}</p>
                    <button data-testid="downloadRecoveryKeyButton" onclick={downloadPrivateKeyFile}>
                        <IconFileDownload />
                    </button>
                </div>
            {/if}
            {#if error}
                <p class="text-red-500">{$LL.chat.e2ee.createRecoveryKey.error()}</p>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <button class="flex-1 justify-center" onclick={() => closeModalAndContinueToWorkAdventure()}>
            {$LL.chat.e2ee.createRecoveryKey.buttons.cancel()}
        </button>
        {#if generatedSecretStorageKey === undefined}
            <button
                disabled={passphraseInput === undefined || passphraseInput?.trim().length === 0}
                class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                onclick={() => generateRecoveryKey(passphraseInput)}
                >{$LL.chat.e2ee.createRecoveryKey.buttons.generate()}
            </button>
        {:else}
            <button
                disabled={!isPrivateKeyDownloaded}
                class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                onclick={closeModalAndContinueToWorkAdventure}
                >{$LL.chat.e2ee.createRecoveryKey.buttons.continue()}
            </button>
        {/if}
    {/snippet}
</Popup>
