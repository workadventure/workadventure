<script lang="ts">
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { VerificationEmojiDialogProps } from "./MatrixSecurity";
    import { IconVerify } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        props: VerificationEmojiDialogProps;
    }

    let { isOpen, props: dialogProps }: Props = $props();
    let waitingOtherDeviceResponse = $state(false);
    let deviceIsVerified = $state(false);

    let { confirmationCallback, mismatchCallback, emojis, donePromise, isThisDeviceVerification } =
        $derived(dialogProps);

    let closeTimeout: ReturnType<typeof setTimeout> | undefined;

    async function mismatchAndCloseModal() {
        try {
            await mismatchCallback();
        } catch (error) {
            console.error("Failed to mismatch emojis validation:", error);
        }

        modals.close();
    }

    async function confirmEmoji() {
        waitingOtherDeviceResponse = true;

        try {
            await confirmationCallback();
            donePromise
                .then(() => {
                    deviceIsVerified = true;
                })
                .catch((error) => {
                    console.error("Failed to verify with emojis validation:", error);
                    return mismatchCallback();
                })
                .catch((error) => {
                    console.error("Failed to verify with emojis validation:", error);
                })
                .finally(() => {
                    closeTimeout = setTimeout(() => {
                        modals.close();
                    }, 10000);
                });
        } catch (error) {
            console.error("Failed to confirm emojis validation:", error);
        }
    }

    onBeforeClose(() => {
        if (closeTimeout) {
            clearTimeout(closeTimeout);
        }
    });
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>
            {isThisDeviceVerification
                ? $LL.chat.verificationEmojiDialog.titleVerifyThisDevice()
                : $LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
        </h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full h-full">
            {#if !deviceIsVerified}
                <div class="w-full text-center">
                    {$LL.chat.verificationEmojiDialog.description()}
                </div>
                <div class="flex flex-wrap justify-center gap-12 mt-8">
                    {#each emojis as [emoji, label], index (index)}
                        <div class="flex flex-col items-center gap-2">
                            <div class="scale-[2.5]">{emoji}</div>
                            <div class="text-center w-full">
                                {Object.keys($LL.chat.emojis).includes(label)
                                    ? // @ts-ignore FIXME : try to find a method to delete ts-ignore
                                      $LL.chat.emojis[label]()
                                    : $LL.chat.emojis.unknownLabel()}
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="w-full py-12 flex justify-center">
                    <IconVerify class="scale-[6]" stroke="2" />
                </div>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        {#if waitingOtherDeviceResponse}
            {#await donePromise}
                {$LL.chat.verificationEmojiDialog.waitOtherDeviceConfirmation()}
            {:then}
                <Button
                    dataTestId="understoodButton"
                    variant="secondary"
                    class="flex-1 bg-secondary"
                    onclick={() => modals.close()}
                    >{$LL.chat.verificationEmojiDialog.understood()}
                </Button>
            {:catch}
                <span data-testid="errorEmojiLabel">
                    {$LL.chat.verificationEmojiDialog.error()}
                </span>
            {/await}
        {:else}
            <Button
                variant="danger"
                class="flex-1 mx-4 py-1"
                dataTestId="mismatchButton"
                onclick={mismatchAndCloseModal}
                >{$LL.chat.verificationEmojiDialog.mismatch()}
            </Button>
            <Button dataTestId="matchButton" variant="secondary" class="flex-1 mx-4 my-2 py-1" onclick={confirmEmoji}
                >{$LL.chat.verificationEmojiDialog.confirmation()}
            </Button>
        {/if}
    {/snippet}
</Popup>
