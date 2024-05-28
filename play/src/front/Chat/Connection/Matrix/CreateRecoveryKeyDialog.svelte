<script lang="ts">

    import { closeModal } from "svelte-modals";
    import { CryptoApi } from "matrix-js-sdk";
    import { GeneratedSecretStorageKey } from "matrix-js-sdk/lib/crypto-api";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { IconFileDownload} from "@tabler/icons-svelte";

    export let isOpen: boolean;
    export let crypto: CryptoApi;
    export let processCallback: (generatedSecretStorageKey: GeneratedSecretStorageKey | undefined) => void;

    let passphraseInput: string | undefined;
    let generatedSecretStorageKey: GeneratedSecretStorageKey | undefined;
    let error = false;
    $: isPrivateKeyDownloaded = false;

    async function generateRecoveryKey(passphrase: string|undefined) {
        if(passphrase === undefined){
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
        closeModal();
    }

    function downloadPrivateKeyFile(){

        const a = document.createElement("a");
        a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(generatedSecretStorageKey?.encodedPrivateKey ?? "");

        //TODO : fileName traduction
        a.setAttribute("download", "private_key.txt");
        a.click();

        if(generatedSecretStorageKey?.encodedPrivateKey){
            navigator.clipboard.writeText(generatedSecretStorageKey.encodedPrivateKey);
        }

        isPrivateKeyDownloaded = true;
    }

</script>

<Popup {isOpen}>
    <h1 slot="title">Chat recovery key creation</h1>
    <div slot="content">
        <p>In order use end 2 end encryption in the chat, you need to create a recovery key.</p>
        <p>Please enter your passphrase bellow, a recovery key will be created.</p>
        <input
            class="tw-w-full tw-rounded-xl tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-2 tw-p tw-border-light-purple tw-border tw-border-solid tw-bg-contrast"
            bind:value={passphraseInput} />
        {#if generatedSecretStorageKey?.encodedPrivateKey}
            <p>This is your private key ! Save if somewhere</p>
            <div class="tw-flex tw-justify-between">
                <p class="tw-text-green-500 tw-m-0 tw-content-center">{generatedSecretStorageKey.encodedPrivateKey}</p>
                <button on:click={downloadPrivateKeyFile}>
                    <IconFileDownload/>
                </button>
            </div>

        {/if}
        {#if error}
            <p class="tw-text-red-500">Something went wrong on generateRecoveryKeyFromPassphrase</p>
        {/if}
    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center" on:click={()=>closeModalAndContinueToWorkAdventure()}>Cancel
        </button>
        {#if generatedSecretStorageKey === undefined}
            <button disabled={passphraseInput===undefined || passphraseInput?.trim().length===0}
                    class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                    on:click={()=>generateRecoveryKey(passphraseInput)}>Generate
            </button>
        {:else}
            <button
                disabled={!isPrivateKeyDownloaded}
                class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                
                on:click={closeModalAndContinueToWorkAdventure}>Continue
            </button>
        {/if}
    </svelte:fragment>
</Popup>
