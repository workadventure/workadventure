<script lang="ts">
    import type { CryptoApi, GeneratedSecretStorageKey } from "matrix-js-sdk/lib/crypto-api";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import SecretInput from "./SecretInput.svelte";
    import { IconCheck, IconCopy, IconFileDownload, IconLoader } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        crypto: CryptoApi;
        processCallback: (generatedSecretStorageKey: GeneratedSecretStorageKey | undefined) => void;
    }

    let { isOpen, crypto, processCallback }: Props = $props();

    let passphraseInput = $state("");
    let passphraseConfirmInput = $state("");
    let passphrasesMatch = $derived(passphraseInput.trim().length > 0 && passphraseInput === passphraseConfirmInput);
    // The key is only installed once the user kept it (downloaded or copied): cancelling before that, or closing
    // the popup, must not leave the account locked by a key nobody has.
    let settled = false;
    function settle(key: GeneratedSecretStorageKey | undefined) {
        if (settled) return;
        settled = true;
        processCallback(key);
    }
    let generatedSecretStorageKey: GeneratedSecretStorageKey | undefined = $state();
    let isGenerating = $state(false);
    let error = $state(false);
    let keptBy: "copy" | "download" | undefined = $state();

    async function generateRecoveryKey() {
        if (!passphrasesMatch) return;
        isGenerating = true;
        error = false;
        try {
            generatedSecretStorageKey = await crypto.createRecoveryKeyFromPassphrase(passphraseInput);
        } catch (e) {
            console.error("Something went wrong on generateRecoveryKeyFromPassphrase : ", e);
            error = true;
        } finally {
            isGenerating = false;
        }
    }

    function closeModalAndContinueToWorkAdventure() {
        settle(keptBy ? generatedSecretStorageKey : undefined);
        modals.close();
    }

    function cancel() {
        settle(undefined);
        modals.close();
    }

    onBeforeClose(() => {
        settle(keptBy ? generatedSecretStorageKey : undefined);
    });

    function copyPrivateKey() {
        const key = generatedSecretStorageKey?.encodedPrivateKey;
        if (!key) return;
        navigator.clipboard
            .writeText(key)
            .then(() => (keptBy = "copy"))
            .catch((error) => console.error("Error on copyPrivateKey : ", error));
    }

    function downloadPrivateKeyFile() {
        const a = document.createElement("a");
        a.href =
            "data:text/plain;charset=utf-8," + encodeURIComponent(generatedSecretStorageKey?.encodedPrivateKey ?? "");
        a.setAttribute("download", "workadventure-recovery-key.txt");
        a.click();
        keptBy = "download";
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <div class="flex flex-col items-start gap-1">
            <span class="text-xs font-bold uppercase tracking-wider text-white/50">
                {$LL.chat.e2ee.createRecoveryKey.step({ current: generatedSecretStorageKey ? 2 : 1, total: 2 })}
            </span>
            <h1 class="text-2xl font-bold">
                {generatedSecretStorageKey
                    ? $LL.chat.e2ee.createRecoveryKey.saveTitle()
                    : $LL.chat.e2ee.createRecoveryKey.title()}
            </h1>
        </div>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5 text-start">
            {#if generatedSecretStorageKey?.encodedPrivateKey}
                <p class="m-0 text-base text-white/80">{$LL.chat.e2ee.createRecoveryKey.privateKeyDescription()}</p>
                <code
                    class="block p-4 rounded-xl bg-white/5 border border-solid border-white/10 font-mono text-lg text-center tracking-wider text-white select-all break-words"
                    data-testid="recoveryKeyValue"
                >
                    {generatedSecretStorageKey.encodedPrivateKey}
                </code>
                <div class="flex gap-2">
                    <Button variant="light" appearance="border" class="flex-1" onclick={copyPrivateKey}>
                        {#snippet icon()}
                            {#if keptBy === "copy"}<IconCheck font-size="18" />{:else}<IconCopy font-size="18" />{/if}
                        {/snippet}
                        {keptBy === "copy"
                            ? $LL.chat.e2ee.createRecoveryKey.copied()
                            : $LL.chat.e2ee.createRecoveryKey.copy()}
                    </Button>
                    <Button
                        variant="light"
                        appearance="border"
                        class="flex-1"
                        dataTestId="downloadRecoveryKeyButton"
                        onclick={downloadPrivateKeyFile}
                    >
                        {#snippet icon()}
                            {#if keptBy === "download"}<IconCheck font-size="18" />{:else}<IconFileDownload
                                    font-size="18"
                                />{/if}
                        {/snippet}
                        {$LL.chat.e2ee.createRecoveryKey.download()}
                    </Button>
                </div>
                <p class="m-0 text-sm {keptBy ? 'text-success-400' : 'text-white/60'}" role="status">
                    {keptBy ? $LL.chat.e2ee.createRecoveryKey.kept() : $LL.chat.e2ee.createRecoveryKey.keepItFirst()}
                </p>
            {:else}
                <p class="m-0 text-base text-white/80">{$LL.chat.e2ee.createRecoveryKey.description()}</p>
                <SecretInput
                    id="newPassphrase"
                    label={$LL.chat.e2ee.createRecoveryKey.passphraseLabel()}
                    dataTestId="passphraseInput"
                    bind:value={passphraseInput}
                />
                <div class="flex flex-col gap-1.5">
                    <SecretInput
                        id="newPassphraseConfirm"
                        label={$LL.chat.e2ee.createRecoveryKey.confirmLabel()}
                        dataTestId="passphraseConfirmInput"
                        invalid={passphraseConfirmInput.length > 0 && !passphrasesMatch}
                        bind:value={passphraseConfirmInput}
                        onEnter={() => generateRecoveryKey()}
                    />
                    {#if passphraseConfirmInput.length > 0}
                        {#if passphrasesMatch}
                            <p class="m-0 flex items-center gap-1 text-sm text-success-400">
                                <IconCheck font-size="16" />
                                {$LL.chat.e2ee.createRecoveryKey.match()}
                            </p>
                        {:else}
                            <p class="m-0 text-sm text-danger-400">{$LL.chat.e2ee.createRecoveryKey.mismatch()}</p>
                        {/if}
                    {/if}
                </div>
                {#if error}
                    <p class="m-0 text-sm text-danger-400" role="alert">{$LL.chat.e2ee.createRecoveryKey.error()}</p>
                {/if}
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full gap-2">
            <Button variant="light" appearance="ghost" class="flex-1" onclick={cancel}>
                {$LL.chat.e2ee.createRecoveryKey.buttons.cancel()}
            </Button>
            {#if generatedSecretStorageKey === undefined}
                <Button
                    variant="secondary"
                    class="flex-1"
                    dataTestId="generateRecoveryKeyButton"
                    disabled={!passphrasesMatch || isGenerating}
                    onclick={() => generateRecoveryKey()}
                >
                    {#if isGenerating}
                        <IconLoader class="animate-spin" font-size="1.25rem" />
                    {:else}
                        {$LL.chat.e2ee.createRecoveryKey.buttons.generate()}
                    {/if}
                </Button>
            {:else}
                <Button
                    variant="secondary"
                    class="flex-1"
                    dataTestId="continueRecoveryKeyButton"
                    disabled={!keptBy}
                    onclick={closeModalAndContinueToWorkAdventure}
                >
                    {$LL.chat.e2ee.createRecoveryKey.buttons.continue()}
                </Button>
            {/if}
        </div>
    {/snippet}
</Popup>
