<script lang="ts">
    import type { Readable } from "svelte/store";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { DeviceVerificationState } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";
    import VerificationEmojiGrid from "./VerificationEmojiGrid.svelte";
    import VerificationOutcome from "./VerificationOutcome.svelte";
    import { IconCheck, IconLoader } from "@wa-icons";
    import { modals, onBeforeClose } from "@wa-modals";

    // Single reactive modal for own-device SAS verification, driven entirely by the `state` store
    // (mirrors Element's VerificationPanel and our QrCodeVerificationModal). No Deferred handoff, no second
    // modal, no shared flag gating the emoji display — the whole flow renders from the store, which is what
    // removes the intermittent "stuck on Waiting for the other device" hang.
    interface Props {
        isOpen: boolean;
        verificationState: Readable<DeviceVerificationState>;
    }

    let { isOpen, verificationState }: Props = $props();

    let current = $derived($verificationState);
    let matchClicked = $state(false);

    onBeforeClose(() => {
        // Closing before completion cancels the request so the peer stops waiting and the re-entrancy flag is
        // released. No-op once the flow is terminal.
        const status = get(verificationState).status;
        if (status !== "done" && status !== "cancelled" && status !== "error") {
            matrixSecurity.cancelOwnDeviceSasVerification().catch((error) => {
                console.error("Failed to cancel device verification on close", error);
            });
        }
    });

    async function confirmEmoji() {
        matchClicked = true;
        try {
            await current.confirmationCallback?.();
        } catch (error) {
            console.error("Failed to confirm emojis validation:", error);
        }
    }

    function retry() {
        modals.close();
        matrixSecurity.verifyOwnDevice().catch((error) => {
            console.error("Failed to restart device verification", error);
        });
    }

    async function mismatchAndCloseModal() {
        try {
            await current.mismatchCallback?.();
        } catch (error) {
            console.error("Failed to mismatch emojis validation:", error);
        }
        modals.close();
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1 class="text-2xl font-bold">
            {#if current.status === "done"}
                {$LL.chat.verificationEmojiDialog.verifiedTitle()}
            {:else if current.status === "error" || current.status === "cancelled"}
                {$LL.chat.verificationEmojiDialog.failedTitle()}
            {:else if current.status === "emoji"}
                {$LL.chat.verificationEmojiDialog.compareTitle()}
            {:else if current.isThisDeviceVerification}
                {$LL.chat.verificationEmojiDialog.titleVerifyThisDevice()}
            {:else}
                {$LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
            {/if}
        </h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5">
            {#if current.status === "done"}
                <VerificationOutcome
                    tone="success"
                    title={$LL.chat.verificationEmojiDialog.verifiedHeading()}
                    description={current.isThisDeviceVerification
                        ? $LL.chat.verificationEmojiDialog.verifiedThisDevice()
                        : $LL.chat.verificationEmojiDialog.verifiedOtherDevice()}
                />
            {:else if current.status === "error"}
                <VerificationOutcome
                    tone="danger"
                    dataTestId="errorEmojiLabel"
                    title={$LL.chat.verificationEmojiDialog.failedHeading()}
                    description={$LL.chat.verificationEmojiDialog.error()}
                />
            {:else if current.status === "cancelled"}
                <VerificationOutcome
                    tone="danger"
                    title={$LL.chat.verificationEmojiDialog.cancelledHeading()}
                    description={$LL.chat.verificationEmojiDialog.cancelled()}
                />
            {:else if current.status === "emoji"}
                {#if matchClicked}
                    <p class="m-0 flex items-center gap-2 text-base text-success-400">
                        <IconCheck font-size="20" />
                        {$LL.chat.verificationEmojiDialog.youConfirmed()}
                    </p>
                {:else}
                    <p class="m-0 text-base text-white/80">{$LL.chat.verificationEmojiDialog.description()}</p>
                {/if}
                <VerificationEmojiGrid emojis={current.emojis ?? []} confirmed={matchClicked} />
            {:else}
                <div class="flex items-center gap-5 p-5 rounded-xl bg-white/5" role="status">
                    <IconLoader class="animate-[spin_2s_linear_infinite] text-secondary-400 shrink-0" font-size="24" />
                    <div class="flex flex-col gap-1">
                        <p class="m-0 text-lg font-bold">{$LL.chat.verificationEmojiDialog.waitForOtherDevice()}</p>
                        <p class="m-0 text-sm text-white/70">
                            {$LL.chat.verificationEmojiDialog.waitForOtherDeviceHint()}
                        </p>
                    </div>
                </div>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full items-center gap-3">
            {#if current.status === "done"}
                <span class="flex-1"></span>
                <Button dataTestId="understoodButton" variant="secondary" class="flex-1" onclick={() => modals.close()}
                    >{$LL.chat.verificationEmojiDialog.understood()}
                </Button>
            {:else if current.status === "error" || current.status === "cancelled"}
                <Button variant="light" appearance="ghost" class="flex-1" onclick={() => modals.close()}>
                    {$LL.chat.verificationEmojiDialog.close()}
                </Button>
                <Button variant="secondary" class="flex-1" dataTestId="retryVerificationButton" onclick={retry}>
                    {$LL.chat.verificationEmojiDialog.tryAgain()}
                </Button>
            {:else if current.status === "emoji" && !matchClicked}
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
            {:else}
                {#if current.status === "emoji"}
                    <span class="flex flex-1 items-center gap-2.5 ps-2 text-white/85" role="status">
                        <IconLoader class="animate-[spin_2s_linear_infinite] text-secondary-400" font-size="20" />
                        {$LL.chat.verificationEmojiDialog.waitOtherDeviceConfirmation()}
                    </span>
                {:else}
                    <span class="flex-1"></span>
                {/if}
                <Button variant="light" appearance="ghost" onclick={() => modals.close()}>
                    {$LL.chat.verificationEmojiDialog.cancel()}
                </Button>
            {/if}
        </div>
    {/snippet}
</Popup>
