<script lang="ts">
    import type { CryptoApi, GeneratedSecretStorageKey } from "matrix-js-sdk/lib/crypto-api";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
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
    let passphraseConfirmInput: string | undefined = $state();
    let passphrasesMatch = $derived(
        (passphraseInput ?? "").trim().length > 0 && passphraseInput === passphraseConfirmInput,
    );
    // The key is only installed once the user kept it (downloaded or copied): cancelling before that, or closing
    // the popup, must not leave the account locked by a key nobody has.
    let settled = false;
    function settle(key: GeneratedSecretStorageKey | undefined) {
        if (settled) return;
        settled = true;
        processCallback(key);
    }
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
        settle(isPrivateKeyDownloaded ? generatedSecretStorageKey : undefined);
        modals.close();
    }

    function cancel() {
        settle(undefined);
        modals.close();
    }

    onBeforeClose(() => {
        settle(isPrivateKeyDownloaded ? generatedSecretStorageKey : undefined);
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
            <label for="newPassphrase" class="m-0">{$LL.chat.e2ee.createRecoveryKey.passphraseLabel()}</label>
            <input
                id="newPassphrase"
                type="password"
                autocomplete="new-password"
                data-testid="passphraseInput"
                class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                bind:value={passphraseInput}
                disabled={generatedSecretStorageKey !== undefined}
                onfocusin={focusChatInput}
                onfocusout={unfocusChatInput}
            />
            <label for="newPassphraseConfirm" class="m-0 mt-2">{$LL.chat.e2ee.createRecoveryKey.confirmLabel()}</label>
            <input
                id="newPassphraseConfirm"
                type="password"
                autocomplete="new-password"
                data-testid="passphraseConfirmInput"
                class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                bind:value={passphraseConfirmInput}
                disabled={generatedSecretStorageKey !== undefined}
                onfocusin={focusChatInput}
                onfocusout={unfocusChatInput}
            />
            {#if (passphraseConfirmInput ?? "").length > 0 && !passphrasesMatch}
                <p class="m-0 mt-1 text-sm text-warning-400">{$LL.chat.e2ee.createRecoveryKey.mismatch()}</p>
            {/if}
            {#if generatedSecretStorageKey?.encodedPrivateKey}
                <p>{$LL.chat.e2ee.createRecoveryKey.privateKeyDescription()}</p>
                <div class="flex justify-between">
                    <p class="text-green-500 m-0 content-center select-text">
                        {generatedSecretStorageKey.encodedPrivateKey}
                    </p>
                    <button
                        data-testid="downloadRecoveryKeyButton"
                        aria-label={$LL.chat.e2ee.createRecoveryKey.download()}
                        title={$LL.chat.e2ee.createRecoveryKey.download()}
                        onclick={downloadPrivateKeyFile}
                    >
                        <IconFileDownload />
                    </button>
                </div>
                {#if isPrivateKeyDownloaded}
                    <p class="text-sm text-success-400">{$LL.chat.e2ee.createRecoveryKey.downloadedAndCopied()}</p>
                {/if}
            {/if}
            {#if error}
                <p class="text-red-500">{$LL.chat.e2ee.createRecoveryKey.error()}</p>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <button class="flex-1 justify-center" onclick={cancel}>
            {$LL.chat.e2ee.createRecoveryKey.buttons.cancel()}
        </button>
        {#if generatedSecretStorageKey === undefined}
            <Button
                variant="secondary"
                disabled={!passphrasesMatch}
                class="disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1"
                onclick={() => generateRecoveryKey(passphraseInput)}
                >{$LL.chat.e2ee.createRecoveryKey.buttons.generate()}
            </Button>
        {:else}
            <Button
                variant="secondary"
                disabled={!isPrivateKeyDownloaded}
                class="disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1"
                onclick={closeModalAndContinueToWorkAdventure}
                >{$LL.chat.e2ee.createRecoveryKey.buttons.continue()}
            </Button>
        {/if}
    {/snippet}
</Popup>
