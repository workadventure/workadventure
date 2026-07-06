<script lang="ts">
    import type { Readable } from "svelte/store";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../Components/ChatLoader.svelte";
    import type { QrVerificationState } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";
    import VerificationQrCode from "./VerificationQrCode.svelte";
    import { modals, onBeforeClose } from "@wa-modals";
    import { IconVerify } from "@wa-icons";

    interface Props {
        isOpen: boolean;
        qrState: Readable<QrVerificationState>;
    }

    let { isOpen, qrState }: Props = $props();

    let state = $derived($qrState);

    onBeforeClose(() => {
        // If the user closes before completion, cancel the underlying request so the scanning device stops
        // waiting and the in-progress flag is released. No-op once Done/Cancelled.
        if (get(qrState).status !== "done") {
            matrixSecurity.cancelOwnDeviceQrVerification().catch((error) => {
                console.error("Failed to cancel QR verification on close", error);
            });
        }
    });
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.verificationQrCodeDialog.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col items-center gap-4">
            {#if state.status === "loading"}
                <ChatLoader label={$LL.chat.verificationQrCodeDialog.preparing()} />
            {:else if state.status === "showing"}
                <div class="text-center">{$LL.chat.verificationQrCodeDialog.scanInstruction()}</div>
                <VerificationQrCode qrCodeBytes={state.qrCodeBytes} />
            {:else if state.status === "reciprocate"}
                <VerificationQrCode qrCodeBytes={state.qrCodeBytes} />
                <div class="text-center">{$LL.chat.verificationQrCodeDialog.reciprocateQuestion()}</div>
            {:else if state.status === "done"}
                <IconVerify class="scale-[6]" stroke="2" />
                <div class="text-center">{$LL.chat.verificationQrCodeDialog.success()}</div>
            {:else if state.status === "unsupported"}
                <div class="text-center" data-testid="qrUnsupportedLabel">
                    {$LL.chat.verificationQrCodeDialog.unsupported()}
                </div>
            {:else if state.status === "cancelled"}
                <div class="text-center">{$LL.chat.verificationQrCodeDialog.cancelled()}</div>
            {:else}
                <div class="text-center" data-testid="qrErrorLabel">
                    {$LL.chat.verificationQrCodeDialog.error()}
                </div>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        {#if state.status === "reciprocate"}
            <button
                class="btn btn-danger flex-1 justify-center mx-4 py-1"
                data-testid="qrReciprocateNoButton"
                onclick={() => state.reciprocate?.cancel()}
            >
                {$LL.chat.verificationQrCodeDialog.reciprocateNo()}
            </button>
            <button
                class="btn btn-secondary flex-1 justify-center mx-4 my-2 py-1 bg-secondary"
                data-testid="qrReciprocateYesButton"
                onclick={() => state.reciprocate?.confirm()}
            >
                {$LL.chat.verificationQrCodeDialog.reciprocateYes()}
            </button>
        {:else if state.status === "showing" || state.status === "loading"}
            <button class="btn flex-1 justify-center bg-danger-900" onclick={() => modals.close()}>
                {$LL.chat.verificationQrCodeDialog.cancel()}
            </button>
        {:else}
            <button
                class="btn btn-secondary flex-1 justify-center bg-secondary"
                data-testid="qrUnderstoodButton"
                onclick={() => modals.close()}
            >
                {$LL.chat.verificationEmojiDialog.understood()}
            </button>
        {/if}
    {/snippet}
</Popup>
