<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { closeModal, onBeforeClose } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { VerificationEmojiDialogProps } from "./MatrixSecurity";
    import { IconVerify } from "@wa-icons";

    export let isOpen: boolean;
    export let props: VerificationEmojiDialogProps;
    let waitingOtherDeviceResponse = false;
    let deviceIsVerified = false;

    const { confirmationCallback, mismatchCallback, emojis, donePromise, isThisDeviceVerification } = props;

    let closeTimeout: ReturnType<typeof setTimeout> | undefined;

    async function mismatchAndCloseModal() {
        try {
            await mismatchCallback();
        } catch (error) {
            console.error(error);
            Sentry.captureMessage(`Failed to mismatch emojis validation : ${error}`);
        }

        closeModal();
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
                    console.error(error);
                    Sentry.captureMessage(`Failed to verify with emojis validation : ${error}`);
                    return mismatchCallback();
                })
                .catch((error) => {
                    console.error(error);
                    Sentry.captureMessage(`Failed to verify with emojis validation : ${error}`);
                })
                .finally(() => {
                    closeTimeout = setTimeout(() => {
                        closeModal();
                    }, 10000);
                });
        } catch (error) {
            console.error(error);
            Sentry.captureMessage(`Failed to confirm emojis validation : ${error}`);
        }
    }

    onBeforeClose(() => {
        if (closeTimeout) {
            clearTimeout(closeTimeout);
        }
    });
</script>

<Popup {isOpen}>
    <h1 slot="title">
        {isThisDeviceVerification
            ? $LL.chat.verificationEmojiDialog.titleVerifyThisDevice()
            : $LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
    </h1>
    <div class="w-full h-full" slot="content">
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
    <svelte:fragment slot="action">
        {#if waitingOtherDeviceResponse}
            {#await donePromise}
                {$LL.chat.verificationEmojiDialog.waitOtherDeviceConfirmation()}
            {:then}
                <button
                    data-testid="understoodButton"
                    class="btn btn-secondary flex-1 justify-center bg-secondary "
                    on:click={closeModal}
                    >{$LL.chat.verificationEmojiDialog.understood()}
                </button>
            {:catch}
                <span data-testid="errorEmojiLabel">
                    {$LL.chat.verificationEmojiDialog.error()}
                </span>
            {/await}
        {:else}
            <button
                class="btn btn-danger flex-1 justify-center mx-4 py-1"
                data-testid="mismatchButton"
                on:click={mismatchAndCloseModal}
                >{$LL.chat.verificationEmojiDialog.mismatch()}
            </button>
            <button
                data-testid="matchButton"
                class="btn btn-secondary flex-1 justify-center mx-4 my-2 py-1"
                on:click={confirmEmoji}
                >{$LL.chat.verificationEmojiDialog.confirmation()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
