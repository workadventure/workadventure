<script lang="ts">
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
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
        <Button
            dataTestId="VerifyWithAnotherDeviceButton"
            variant="secondary"
            class="bg-secondary flex-1"
            onclick={startVerificationWithOtherDevice}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withOtherDevice()}
        </Button>
        <Button
            dataTestId="VerifyWithPassphraseButton"
            variant="secondary"
            class="bg-secondary flex-1"
            onclick={startVerificationWithPassphrase}
            >{$LL.chat.chooseDeviceVerificationMethodModal.withPassphrase()}
        </Button>
    {/snippet}
</Popup>
