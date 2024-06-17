<script lang="ts">
    import { MatrixClient, SecretStorage } from "matrix-js-sdk";
    import { closeModal, onBeforeClose } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { makeInputToKey } from "./MatrixSecurity";
    import { IconEdit, IconKey } from "@wa-icons";

    export let isOpen: boolean;
    export let keyInfo: SecretStorage.SecretStorageKeyDescription;
    export let matrixClient: MatrixClient;
    export let onClose: (key: Uint8Array | null) => void;
    let accessSecretStorageMethod: "passphrase" | "recoveryKey" = "passphrase";
    let recoveryKeyInput = "";
    let passphraseInput = "";
    let error = false;
    let hasCancelAccessSecretStorage = true;

    function changeAccessSecretStorageMethod() {
        if (accessSecretStorageMethod === "passphrase") {
            accessSecretStorageMethod = "recoveryKey";
            return;
        }
        accessSecretStorageMethod = "passphrase";
    }

    async function checkAndSubmitRecoveryOrPassphraseIfValid() {
        if (recoveryKeyInput.trim().length === 0 && passphraseInput.trim().length === 0) {
            error = true;
            return;
        }
        const inputToKey = makeInputToKey(keyInfo);
        const key = await inputToKey({ recoveryKey: recoveryKeyInput, passphrase: passphraseInput });
        const keyVerified = await matrixClient.secretStorage.checkKey(key, keyInfo);

        if (keyVerified === false) {
            console.debug("Unable to verify key");
            error = true;
            return;
        }
        hasCancelAccessSecretStorage = false;
        onClose(key);
        closeModal();
    }

    function cancelAccessSecretStorage() {
        onClose(null);
        closeModal();
    }

    onBeforeClose(() => {
        if (hasCancelAccessSecretStorage) {
            onClose(null);
        }
    });

    $: confirmInputDisabled =
        accessSecretStorageMethod === "passphrase"
            ? passphraseInput.trim().length === 0
            : recoveryKeyInput.trim().length === 0;

    const changeAccessSecretStorageMethodButtonClass = "tw-self-end tw-text-blue-500";
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.e2ee.accessSecretStorage.title()}</h1>
    <div slot="content" class="tw-flex tw-flex-col">
        <p>{$LL.chat.e2ee.accessSecretStorage.description()}</p>
        {#if accessSecretStorageMethod === "passphrase"}
            <label for="passphrase"> <IconEdit /> {$LL.chat.e2ee.accessSecretStorage.passphrase()}</label>
            <input
                id="passphrase"
                type="password"
                autocomplete="new-password"
                data-testid="passphraseInput"
                class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                placeholder={`${$LL.chat.e2ee.accessSecretStorage.placeholder()} ${$LL.chat.e2ee.accessSecretStorage.passphrase()}`}
                bind:value={passphraseInput}
                on:keydown={(key) => {
                    key.key === "Enter"
                        ? checkAndSubmitRecoveryOrPassphraseIfValid().catch((error) => console.error(error))
                        : undefined;
                }}
            />
            <button on:click={changeAccessSecretStorageMethod} class={changeAccessSecretStorageMethodButtonClass}>
                <IconKey /> {$LL.chat.e2ee.accessSecretStorage.buttons.useRecoveryKey()}</button
            >
        {:else}
            <label for="recoveryKey"> <IconKey /> {$LL.chat.e2ee.accessSecretStorage.recoveryKey()}</label>
            <input
                id="recoveryKey"
                placeholder={`${$LL.chat.e2ee.accessSecretStorage.placeholder()} ${$LL.chat.e2ee.accessSecretStorage.recoveryKey()}`}
                type="password"
                autocomplete="new-password"
                data-testid="recoveryKeyInput"
                class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                bind:value={recoveryKeyInput}
            />
            <button on:click={changeAccessSecretStorageMethod} class={changeAccessSecretStorageMethodButtonClass}>
                <IconEdit /> {$LL.chat.e2ee.accessSecretStorage.buttons.usePassphrase()}</button
            >
        {/if}

        {#if error}
            <p class="tw-text-red-500">
                {`${accessSecretStorageMethod === "passphrase" ? "Passphrase" : "RecoveryKey"}  is wrong !`}
            </p>
        {/if}
    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center" on:click={cancelAccessSecretStorage}
            >{$LL.chat.e2ee.accessSecretStorage.buttons.cancel()}</button
        >
        <button
            disabled={confirmInputDisabled}
            class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
            on:click={() => checkAndSubmitRecoveryOrPassphraseIfValid()}
            >{$LL.chat.e2ee.accessSecretStorage.buttons.confirm()}
        </button>
    </svelte:fragment>
</Popup>
