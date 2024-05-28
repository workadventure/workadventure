<script lang="ts">

    import { MatrixClient, SecretStorage } from "matrix-js-sdk";
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { makeInputToKey } from "./MatrixSecurity";
    import { IconEdit, IconKey } from "@tabler/icons-svelte";

    export let isOpen: boolean;
    export let keyInfo: SecretStorage.SecretStorageKeyDescription;
    export let matrixClient: MatrixClient;
    export let onClose: (key: Uint8Array | null) => void;
    let accessSecretStorageMethod: "passphrase" | "recoveryKey" = "passphrase";
    let recoveryKeyInput: string = "";
    let passphraseInput: string = "";
    let error = false;


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

        onClose(key);
        closeModal();
    }

    $: confirmInputDisabled = accessSecretStorageMethod === "passphrase" ? passphraseInput.trim().length === 0 : recoveryKeyInput.trim().length === 0;

    const changeAccessSecretStorageMethodButtonClass= "tw-self-end tw-text-blue-500";

</script>
<Popup {isOpen}>
    <h1 slot="title">Chat recovery key required</h1>
    <div slot="content" class="tw-flex tw-flex-col">
        <p>In order to access your older message, you need to enter the recovery key.</p>
        {#if accessSecretStorageMethod === "passphrase"}
            <label for="passphrase"><IconEdit/> Passphrase</label>
            <input
                id="passphrase"
                type="password"
                class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                placeholder="Enter your passphrase" bind:value={passphraseInput} />
            <button on:click={changeAccessSecretStorageMethod} class={changeAccessSecretStorageMethodButtonClass}><IconKey/> Use recovery key instead</button>
        {:else}
            <label for="recoveryKey"><IconKey/> Recovery key</label>
            <input
                id="recoveryKey"
                placeholder="Enter your recovery key"
                type="password"
                class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
                bind:value={recoveryKeyInput} />
            <button on:click={changeAccessSecretStorageMethod} class={changeAccessSecretStorageMethodButtonClass}><IconEdit/> Use passphrase instead</button>

        {/if}

        {#if error}
            <p class="tw-text-red-500">{`${accessSecretStorageMethod === "passphrase" ? "Passphrase" : "RecoveryKey"}  is wrong !`}</p>
        {/if}
    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center" on:click={()=>{onClose(null);closeModal()}}>Cancel</button>
        <button disabled={confirmInputDisabled}
                class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                on:click={()=>checkAndSubmitRecoveryOrPassphraseIfValid()}>Confirm
        </button>
    </svelte:fragment>
</Popup>
