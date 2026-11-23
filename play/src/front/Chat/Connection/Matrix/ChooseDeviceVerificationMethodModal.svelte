<script lang="ts">
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { matrixSecurity } from "./MatrixSecurity";
    import VerificationMethodCard from "./VerificationMethodCard.svelte";
    import { IconDevices, IconKey } from "@wa-icons";
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
        <h1 class="text-2xl font-bold">{$LL.chat.chooseDeviceVerificationMethodModal.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5">
            <p class="m-0 text-base text-white/80">{$LL.chat.chooseDeviceVerificationMethodModal.description()}</p>
            <div class="flex flex-col gap-3">
                <VerificationMethodCard
                    dataTestId="VerifyWithAnotherDeviceButton"
                    title={$LL.chat.chooseDeviceVerificationMethodModal.withOtherDevice()}
                    description={$LL.chat.chooseDeviceVerificationMethodModal.withOtherDeviceDescription()}
                    onclick={startVerificationWithOtherDevice}
                >
                    {#snippet icon()}
                        <IconDevices font-size="22" />
                    {/snippet}
                </VerificationMethodCard>
                <VerificationMethodCard
                    dataTestId="VerifyWithPassphraseButton"
                    title={$LL.chat.chooseDeviceVerificationMethodModal.withPassphrase()}
                    description={$LL.chat.chooseDeviceVerificationMethodModal.withPassphraseDescription()}
                    onclick={startVerificationWithPassphrase}
                >
                    {#snippet icon()}
                        <IconKey font-size="22" />
                    {/snippet}
                </VerificationMethodCard>
            </div>
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full">
            <Button variant="light" appearance="ghost" onclick={() => modals.close()}>
                {$LL.chat.chooseDeviceVerificationMethodModal.notNow()}
            </Button>
        </div>
    {/snippet}
</Popup>
