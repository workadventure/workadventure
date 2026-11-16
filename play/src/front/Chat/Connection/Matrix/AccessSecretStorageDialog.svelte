<script lang="ts">
    import type { MatrixClient, SecretStorage } from "matrix-js-sdk";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import resetKeyStorageConfirmationModal from "../../../Components/Menu/ResetKeyStorageConfirmationModal.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { MatrixSecurity } from "./MatrixSecurity";
    import SecretInput from "./SecretInput.svelte";
    import { IconLoader } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        keyInfo: SecretStorage.SecretStorageKeyDescription;
        matrixClient: MatrixClient;
        onClose: (key: Uint8Array<ArrayBuffer> | null) => void;
    }

    let { isOpen, keyInfo, matrixClient, onClose }: Props = $props();
    let accessSecretStorageMethod: "passphrase" | "recoveryKey" = $state("passphrase");
    let recoveryKeyInput = $state("");
    let passphraseInput = $state("");
    let error = $state(false);
    let hasCancelAccessSecretStorage = true;
    let isCheckingPassphrase = $state(false);

    async function checkAndSubmitRecoveryOrPassphraseIfValid() {
        if (confirmInputDisabled) return;
        isCheckingPassphrase = true;

        try {
            const inputToKey = MatrixSecurity.makeInputToKey(keyInfo);
            // Only the field of the selected tab counts: a value left in the other one must not win.
            const passphrase = accessSecretStorageMethod === "passphrase" ? passphraseInput : undefined;
            const recoveryKey = accessSecretStorageMethod === "recoveryKey" ? recoveryKeyInput : undefined;
            const key = await inputToKey({ recoveryKey, passphrase });
            const keyVerified = await matrixClient.secretStorage.checkKey(key, keyInfo);

            if (keyVerified === false) {
                throw new Error("The key is not verified !");
            }

            hasCancelAccessSecretStorage = false;
            onClose(key);
            modals.close();
        } catch (e) {
            console.debug("Unable to verify key", e);
            error = true;
            return;
        } finally {
            isCheckingPassphrase = false;
        }
    }

    function cancelAccessSecretStorage() {
        onClose(null);
        modals.close();
    }

    function switchToRestoreConfirmationModal() {
        modals.close();
        modals.open(resetKeyStorageConfirmationModal);
    }

    onBeforeClose(() => {
        if (hasCancelAccessSecretStorage) {
            onClose(null);
        }
    });

    let methods = $derived([
        ["passphrase", $LL.chat.e2ee.accessSecretStorage.passphrase()],
        ["recoveryKey", $LL.chat.e2ee.accessSecretStorage.recoveryKey()],
    ] as const);

    let confirmInputDisabled = $derived(
        accessSecretStorageMethod === "passphrase"
            ? passphraseInput.trim().length === 0
            : recoveryKeyInput.trim().length === 0,
    );
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1 class="text-2xl font-bold">{$LL.chat.e2ee.accessSecretStorage.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5 text-start">
            <p class="m-0 text-base text-white/80">{$LL.chat.e2ee.accessSecretStorage.description()}</p>
            <div class="flex p-1 gap-1 rounded-lg bg-white/5 border border-solid border-white/10" role="group">
                {#each methods as [method, label] (method)}
                    <button
                        type="button"
                        class="flex-1 py-1.5 rounded-md text-sm font-bold {accessSecretStorageMethod === method
                            ? 'bg-white/15 text-white'
                            : 'text-white/60 hover:text-white'}"
                        aria-pressed={accessSecretStorageMethod === method}
                        onclick={() => {
                            accessSecretStorageMethod = method;
                            error = false;
                        }}
                    >
                        {label}
                    </button>
                {/each}
            </div>
            <div class="flex flex-col gap-1.5">
                {#if accessSecretStorageMethod === "passphrase"}
                    <SecretInput
                        id="passphrase"
                        label={$LL.chat.e2ee.accessSecretStorage.passphrase()}
                        placeholder={$LL.chat.e2ee.accessSecretStorage.enterPassphrase()}
                        dataTestId="passphraseInput"
                        invalid={error}
                        bind:value={passphraseInput}
                        onEnter={() => checkAndSubmitRecoveryOrPassphraseIfValid()}
                    />
                {:else}
                    <SecretInput
                        id="recoveryKey"
                        label={$LL.chat.e2ee.accessSecretStorage.recoveryKey()}
                        placeholder={$LL.chat.e2ee.accessSecretStorage.enterRecoveryKey()}
                        dataTestId="recoveryKeyInput"
                        mono
                        invalid={error}
                        bind:value={recoveryKeyInput}
                        onEnter={() => checkAndSubmitRecoveryOrPassphraseIfValid()}
                    />
                {/if}
                {#if error}
                    <p class="m-0 text-sm text-danger-400" role="alert">
                        {accessSecretStorageMethod === "passphrase"
                            ? $LL.chat.e2ee.accessSecretStorage.passphraseWrong()
                            : $LL.chat.e2ee.accessSecretStorage.recoveryKeyWrong()}
                    </p>
                {/if}
            </div>
            <button
                type="button"
                class="self-start p-0 text-sm text-danger-400 hover:underline"
                data-testid="lostBothResetButton"
                onclick={switchToRestoreConfirmationModal}
            >
                {$LL.chat.e2ee.accessSecretStorage.buttons.lostBoth()}
            </button>
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full gap-2">
            <Button variant="light" appearance="ghost" class="flex-1" onclick={cancelAccessSecretStorage}>
                {$LL.chat.e2ee.accessSecretStorage.buttons.cancel()}
            </Button>
            <Button
                variant="secondary"
                disabled={confirmInputDisabled || isCheckingPassphrase}
                class="flex-1"
                dataTestId="confirmAccessSecretStorageButton"
                onclick={() => checkAndSubmitRecoveryOrPassphraseIfValid()}
            >
                {#if isCheckingPassphrase}
                    <IconLoader class="animate-spin" font-size="1.25rem" />
                {:else}
                    {$LL.chat.e2ee.accessSecretStorage.buttons.confirm()}
                {/if}
            </Button>
        </div>
    {/snippet}
</Popup>
