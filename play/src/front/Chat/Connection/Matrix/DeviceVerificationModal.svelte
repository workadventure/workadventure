<script lang="ts">
    import type { Readable } from "svelte/store";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../Components/ChatLoader.svelte";
    import type { DeviceVerificationState } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";
    import { IconVerify } from "@wa-icons";
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
        <h1>
            {current.isThisDeviceVerification
                ? $LL.chat.verificationEmojiDialog.titleVerifyThisDevice()
                : $LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
        </h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full h-full">
            {#if current.status === "done"}
                <div class="w-full py-12 flex justify-center">
                    <IconVerify class="scale-[6]" stroke="2" />
                </div>
            {:else if current.status === "emoji"}
                {@const emojis = current.emojis ?? []}
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
                <div>
                    <ChatLoader label={$LL.chat.verificationEmojiDialog.waitForOtherDevice()} />
                </div>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        {#if current.status === "done"}
            <Button
                dataTestId="understoodButton"
                variant="secondary"
                class="flex-1 bg-secondary"
                onclick={() => modals.close()}
                >{$LL.chat.verificationEmojiDialog.understood()}
            </Button>
        {:else if current.status === "error"}
            <span data-testid="errorEmojiLabel">
                {$LL.chat.verificationEmojiDialog.error()}
            </span>
        {:else if current.status === "emoji" && !matchClicked}
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
        {:else}
            {$LL.chat.verificationEmojiDialog.waitOtherDeviceConfirmation()}
        {/if}
    {/snippet}
</Popup>
