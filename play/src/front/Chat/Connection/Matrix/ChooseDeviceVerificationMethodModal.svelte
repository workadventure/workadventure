<script lang="ts">
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { matrixSecurity } from "./MatrixSecurity";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();

    function startVerificationWithPassphrase() {
        matrixSecurity.initClientCryptoConfiguration().catch((error) => {
            console.error("Failed to startVerificationWithPassphrase : ", error);
        });
        modals.close();
    }

    function startVerificationWithOtherDevice() {
        matrixSecurity.verifyOwnDevice().catch((error) => {
            console.error("Failed to verify own device : ", error);
        });
        modals.close();
    }

    function startVerificationWithQrCode() {
        matrixSecurity.showQrForOwnDevice().catch((error) => {
            console.error("Failed to show QR code for own device : ", error);
        });
        modals.close();
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.chooseDeviceVerificationMethodModal.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex justify-center">
            {$LL.chat.chooseDeviceVerificationMethodModal.description()}
        </div>
    {/snippet}
    {#snippet action()}
        <button
            data-testid="VerifyWithAnotherDeviceButton"
            class="btn btn-secondary bg-secondary flex-1 justify-center"
            onclick={startVerificationWithOtherDevice}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withOtherDevice()}
        </button>
        <button
            data-testid="ShowQrCodeButton"
            class="btn btn-secondary bg-secondary flex-1 justify-center"
            onclick={startVerificationWithQrCode}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withQrCode()}
        </button>
        <button
            data-testid="VerifyWithPassphraseButton"
            class="btn btn-secondary bg-secondary flex-1 justify-center"
            onclick={startVerificationWithPassphrase}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withPassphrase()}
        </button>
    {/snippet}
</Popup>
