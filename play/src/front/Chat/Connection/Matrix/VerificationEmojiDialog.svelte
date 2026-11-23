<script lang="ts">
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { VerificationEmojiDialogProps } from "./MatrixSecurity";
    import VerificationEmojiGrid from "./VerificationEmojiGrid.svelte";
    import VerificationOutcome from "./VerificationOutcome.svelte";
    import { IconCheck, IconLoader } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        props: VerificationEmojiDialogProps;
    }

    let { isOpen, props: dialogProps }: Props = $props();
    let status: "emoji" | "confirming" | "done" | "error" = $state("emoji");

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
        status = "confirming";

        try {
            await confirmationCallback();
            donePromise
                .then(() => {
                    status = "done";
                })
                .catch((error) => {
                    console.error("Failed to verify with emojis validation:", error);
                    status = "error";
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
            status = "error";
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
        <h1 class="text-2xl font-bold">
            {#if status === "done"}
                {$LL.chat.verificationEmojiDialog.verifiedTitle()}
            {:else if status === "error"}
                {$LL.chat.verificationEmojiDialog.failedTitle()}
            {:else}
                {$LL.chat.verificationEmojiDialog.compareTitle()}
            {/if}
        </h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5">
            {#if status === "done"}
                <VerificationOutcome
                    tone="success"
                    title={$LL.chat.verificationEmojiDialog.verifiedHeading()}
                    description={isThisDeviceVerification
                        ? $LL.chat.verificationEmojiDialog.verifiedThisDevice()
                        : $LL.chat.verificationEmojiDialog.verifiedOtherDevice()}
                />
            {:else if status === "error"}
                <VerificationOutcome
                    tone="danger"
                    dataTestId="errorEmojiLabel"
                    title={$LL.chat.verificationEmojiDialog.failedHeading()}
                    description={$LL.chat.verificationEmojiDialog.error()}
                />
            {:else}
                {#if status === "confirming"}
                    <p class="m-0 flex items-center gap-2 text-base text-success-400">
                        <IconCheck font-size="20" />
                        {$LL.chat.verificationEmojiDialog.youConfirmed()}
                    </p>
                {:else}
                    <p class="m-0 text-base text-white/80">{$LL.chat.verificationEmojiDialog.description()}</p>
                {/if}
                <VerificationEmojiGrid {emojis} confirmed={status === "confirming"} />
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full items-center gap-3">
            {#if status === "done"}
                <span class="flex-1"></span>
                <Button dataTestId="understoodButton" variant="secondary" class="flex-1" onclick={() => modals.close()}
                    >{$LL.chat.verificationEmojiDialog.understood()}
                </Button>
            {:else if status === "error"}
                <span class="flex-1"></span>
                <Button variant="light" appearance="ghost" class="flex-1" onclick={() => modals.close()}>
                    {$LL.chat.verificationEmojiDialog.close()}
                </Button>
            {:else if status === "confirming"}
                <span class="flex flex-1 items-center gap-2.5 ps-2 text-white/85" role="status">
                    <IconLoader class="animate-[spin_2s_linear_infinite] text-secondary-400" font-size="20" />
                    {$LL.chat.verificationEmojiDialog.waitOtherDeviceConfirmation()}
                </span>
            {:else}
                <Button
                    variant="danger"
                    appearance="border"
                    class="flex-1"
                    dataTestId="mismatchButton"
                    onclick={mismatchAndCloseModal}
                    >{$LL.chat.verificationEmojiDialog.mismatch()}
                </Button>
                <Button dataTestId="matchButton" variant="secondary" class="flex-1" onclick={confirmEmoji}>
                    {#snippet icon()}
                        <IconCheck font-size="20" />
                    {/snippet}
                    {$LL.chat.verificationEmojiDialog.confirmation()}
                </Button>
            {/if}
        </div>
    {/snippet}
</Popup>
