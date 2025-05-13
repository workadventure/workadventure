<script lang="ts">
    import { MatrixClient, SecretStorage } from "matrix-js-sdk";
    import { closeModal, onBeforeClose, openModal } from "svelte-modals";
    import * as Sentry from "@sentry/svelte";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import resetKeyStorageConfirmationModal from "../../../Components/Menu/ResetKeyStorageConfirmationModal.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { MatrixSecurity } from "./MatrixSecurity";
    import { IconEdit, IconKey, IconLoader, IconRestore } from "@wa-icons";

    export let isOpen: boolean;
    export let keyInfo: SecretStorage.SecretStorageKeyDescription;
    export let matrixClient: MatrixClient;
    export let onClose: (key: Uint8Array | null) => void;
    let accessSecretStorageMethod: "passphrase" | "recoveryKey" = "passphrase";
    let recoveryKeyInput = "";
    let passphraseInput = "";
    let error = false;
    let hasCancelAccessSecretStorage = true;
    let isCheckingPassphrase = false;

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
            closeModal();
        } catch (e) {
            console.debug("Unable to verify key");
            Sentry.captureMessage(`Unable to verify key: ${e}`);
            error = true;
            return;
        } finally {
            isCheckingPassphrase = false;
        }
    }

    function cancelAccessSecretStorage() {
        onClose(null);
        closeModal();
    }

    function switchToRestoreConfirmationModal() {
        closeModal();
        openModal(resetKeyStorageConfirmationModal);
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

    $: confirmInputDisabled =
        accessSecretStorageMethod === "passphrase"
            ? passphraseInput.trim().length === 0
            : recoveryKeyInput.trim().length === 0;

    const changeAccessSecretStorageMethodButtonClass = "self-end text-blue-500";
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.e2ee.accessSecretStorage.title()}</h1>
    <div slot="content" class="flex flex-col">
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
                on:keydown={(key) => {
                    if (key.key === "Enter") {
                        checkAndSubmitRecoveryOrPassphraseIfValid().catch((error) => console.error(error));
                    }
                }}
                on:focusin={focusChatInput}
                on:focusout={unfocusChatInput}
            />
            <div class="flex flex-row justify-between">
                <button class="self-start text-blue-500" on:click={switchToRestoreConfirmationModal}>
                    <IconRestore />
                    {$LL.menu.chat.resetKeyStorageUpButtonLabel()}
                </button>
                <button on:click={changeAccessSecretStorageMethod} class={changeAccessSecretStorageMethodButtonClass}>
                    <IconEdit /> {$LL.chat.e2ee.accessSecretStorage.buttons.useRecoveryKey()}</button
                >
            </div>
        {:else}
            <label for="recoveryKey"> <IconKey /> {$LL.chat.e2ee.accessSecretStorage.recoveryKey()}</label>
            <input
                id="recoveryKey"
                placeholder={`${$LL.chat.e2ee.accessSecretStorage.placeholder()} ${$LL.chat.e2ee.accessSecretStorage.recoveryKey()}`}
                type="password"
                autocomplete="new-password"
                data-testid="recoveryKeyInput"
                class="w-full rounded-md text-white placeholder:text-sm px-3 py-2 p border-light-purple border border-solid bg-contrast"
                bind:value={recoveryKeyInput}
                on:focusin={focusChatInput}
                on:focusout={unfocusChatInput}
            />
            <div class="flex flex-row justify-between">
                <button class="self-start text-blue-500" on:click={switchToRestoreConfirmationModal}>
                    <IconRestore />
                    {$LL.menu.chat.resetKeyStorageUpButtonLabel()}
                </button>
                <button on:click={changeAccessSecretStorageMethod} class={changeAccessSecretStorageMethodButtonClass}>
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
    <svelte:fragment slot="action">
        <button class="btn flex-1 justify-center hover:bg-white/10" on:click={cancelAccessSecretStorage}
            >{$LL.chat.e2ee.accessSecretStorage.buttons.cancel()}</button
        >
        <button
            disabled={confirmInputDisabled || isCheckingPassphrase}
            class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            data-testid="confirmAccessSecretStorageButton"
            on:click={() => checkAndSubmitRecoveryOrPassphraseIfValid()}
        >
            {#if isCheckingPassphrase}
                <IconLoader font-size="1.25rem" />
            {:else}
                {$LL.chat.e2ee.accessSecretStorage.buttons.confirm()}
            {/if}
        </button>
    </svelte:fragment>
</Popup>
