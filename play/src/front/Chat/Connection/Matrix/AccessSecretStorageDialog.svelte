<script lang="ts">
    import type { MatrixClient, SecretStorage } from "matrix-js-sdk";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import resetKeyStorageConfirmationModal from "../../../Components/Menu/ResetKeyStorageConfirmationModal.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { MatrixSecurity } from "./MatrixSecurity";
    import { IconEdit, IconKey, IconLoader, IconRestore } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        keyInfo: SecretStorage.SecretStorageKeyDescription;
        matrixClient: MatrixClient;
        onClose: (key: Uint8Array | null) => void;
    }

    let { isOpen, keyInfo, matrixClient, onClose }: Props = $props();
    let accessSecretStorageMethod: "passphrase" | "recoveryKey" = $state("passphrase");
    let recoveryKeyInput = $state("");
    let passphraseInput = $state("");
    let error = $state(false);
    let hasCancelAccessSecretStorage = true;
    let isCheckingPassphrase = $state(false);

    function changeAccessSecretStorageMethod() {
        if (accessSecretStorageMethod === "passphrase") {
            accessSecretStorageMethod = "recoveryKey";
            return;
        }
        accessSecretStorageMethod = "passphrase";
    }

    async function checkAndSubmitRecoveryOrPassphraseIfValid() {
        isCheckingPassphrase = true;
        if (recoveryKeyInput.trim().length === 0 && passphraseInput.trim().length === 0) {
            error = true;
            return;
        }

        try {
            const inputToKey = MatrixSecurity.makeInputToKey(keyInfo);
            const passphrase = passphraseInput.trim().length === 0 ? undefined : passphraseInput;
            const recoveryKey = recoveryKeyInput.trim().length === 0 ? undefined : recoveryKeyInput;
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

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }

    let confirmInputDisabled = $derived(
        accessSecretStorageMethod === "passphrase"
            ? passphraseInput.trim().length === 0
            : recoveryKeyInput.trim().length === 0,
    );

    const changeAccessSecretStorageMethodButtonClass = "self-end text-blue-500";
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.e2ee.accessSecretStorage.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="flex flex-col">
            <p>{$LL.chat.e2ee.accessSecretStorage.description()}</p>
            {#if accessSecretStorageMethod === "passphrase"}
                <label for="passphrase"> <IconEdit /> {$LL.chat.e2ee.accessSecretStorage.passphrase()}</label>
                <input
                    id="passphrase"
                    type="password"
                    autocomplete="new-password"
                    data-testid="passphraseInput"
                    class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                    placeholder={`${$LL.chat.e2ee.accessSecretStorage.placeholder()} ${$LL.chat.e2ee.accessSecretStorage.passphrase()}`}
                    bind:value={passphraseInput}
                    onkeydown={(key) => {
                        if (key.key === "Enter") {
                            checkAndSubmitRecoveryOrPassphraseIfValid().catch((error) => console.error(error));
                        }
                    }}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />
                <div class="flex flex-row justify-between">
                    <button class="self-start text-blue-500" onclick={switchToRestoreConfirmationModal}>
                        <IconRestore />
                        {$LL.menu.chat.resetKeyStorageUpButtonLabel()}
                    </button>
                    <button
                        onclick={changeAccessSecretStorageMethod}
                        class={changeAccessSecretStorageMethodButtonClass}
                    >
                        <IconEdit /> {$LL.chat.e2ee.accessSecretStorage.buttons.useRecoveryKey()}</button
                    >
                </div>
            {:else}
                <label for="recoveryKey">
                    <IconKey />
                    {$LL.chat.e2ee.accessSecretStorage.recoveryKey()}
                </label>
                <input
                    id="recoveryKey"
                    placeholder={`${$LL.chat.e2ee.accessSecretStorage.placeholder()} ${$LL.chat.e2ee.accessSecretStorage.recoveryKey()}`}
                    type="password"
                    autocomplete="new-password"
                    data-testid="recoveryKeyInput"
                    class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                    bind:value={recoveryKeyInput}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />
                <div class="flex flex-row justify-between">
                    <button class="self-start text-blue-500" onclick={switchToRestoreConfirmationModal}>
                        <IconRestore />
                        {$LL.menu.chat.resetKeyStorageUpButtonLabel()}
                    </button>
                    <button
                        onclick={changeAccessSecretStorageMethod}
                        class={changeAccessSecretStorageMethodButtonClass}
                    >
                        <IconEdit /> {$LL.chat.e2ee.accessSecretStorage.buttons.usePassphrase()}</button
                    >
                </div>
            {/if}

            {#if error}
                <p class="text-red-500">
                    {`${accessSecretStorageMethod === "passphrase" ? "Passphrase" : "RecoveryKey"}  is wrong !`}
                </p>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <button class="btn flex-1 justify-center hover:bg-white/10" onclick={cancelAccessSecretStorage}>
            {$LL.chat.e2ee.accessSecretStorage.buttons.cancel()}
        </button>
        <button
            disabled={confirmInputDisabled || isCheckingPassphrase}
            class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            data-testid="confirmAccessSecretStorageButton"
            onclick={() => checkAndSubmitRecoveryOrPassphraseIfValid()}
        >
            {#if isCheckingPassphrase}
                <IconLoader font-size="1.25rem" />
            {:else}
                {$LL.chat.e2ee.accessSecretStorage.buttons.confirm()}
            {/if}
        </button>
    {/snippet}
</Popup>
