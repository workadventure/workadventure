<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { matrixSecurity } from "./MatrixSecurity";

    export let isOpen: boolean;

    function startVerificationWithPassphrase() {
        matrixSecurity.initClientCryptoConfiguration().catch((error) => {
            console.error("Failed to startVerificationWithPassphrase : ", error);
        });
        closeModal();
    }

    function startVerificationWithOtherDevice() {
        matrixSecurity.verifyOwnDevice().catch((error) => {
            console.error("Failed to verify own device : ", error);
        });
        closeModal();
    }
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.chooseDeviceVerificationMethodModal.title()}</h1>
    <div slot="content" class="w-full flex justify-center">
        {$LL.chat.chooseDeviceVerificationMethodModal.description()}
    </div>
    <svelte:fragment slot="action">
        <button
            data-testid="VerifyWithAnotherDeviceButton"
            class="btn btn-secondary bg-secondary flex-1 justify-center"
            on:click={startVerificationWithOtherDevice}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withOtherDevice()}
        </button>
        <button
            data-testid="VerifyWithPassphraseButton"
            class="btn btn-secondary bg-secondary flex-1 justify-center"
            on:click={startVerificationWithPassphrase}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withPassphrase()}
        </button>
    </svelte:fragment>
</Popup>
