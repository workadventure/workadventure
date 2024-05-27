<script lang="ts">

    import { MatrixClient, SecretStorage } from "matrix-js-sdk";
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { makeInputToKey } from "./MatrixSecurity";

    export let isOpen: boolean;
    export let keyInfo: SecretStorage.SecretStorageKeyDescription;
    export let matrixClient: MatrixClient;
    export let onClose: (key: Uint8Array|null) => void;
    let recoveryKeyInput: string | undefined;
    let error = false;


    //Very bad naming, this is for testing purpose
    async function checkAndSubmitRecoveryKeyIfValid(recoveryKey: string | undefined) {
        if (recoveryKey === undefined) {
            error = true;
        }
        const inputToKey = makeInputToKey(keyInfo);
        const key = await inputToKey({ recoveryKey });
        const keyVerified = await matrixClient.secretStorage.checkKey(key, keyInfo);

        if (keyVerified) {
            onClose(key);
            closeModal();
        }
        error = true
    }

</script>
<Popup {isOpen}>
    <h1 slot="title">Chat recovery key required</h1>
    <div slot="content">
        <p>In order to access your older message, you need to enter the recovery key.</p>
        <input class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast" bind:value={recoveryKeyInput} />
        {#if error}
            <p class="tw-text-red-500">Recovery key is wrong !</p>
        {/if}
    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center" on:click={()=>{onClose(null);closeModal()}}>Cancel</button>
        <button disabled={recoveryKeyInput===undefined || recoveryKeyInput?.trim().length===0} class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center" on:click={()=>checkAndSubmitRecoveryKeyIfValid(recoveryKeyInput)}>Confirm</button>
    </svelte:fragment>
</Popup>
