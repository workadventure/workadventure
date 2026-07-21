<script lang="ts">
    import type { ShowSasCallbacks, Verifier } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationRequestEvent, VerifierEvent, VerificationPhase } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationMethod } from "matrix-js-sdk/lib/types";
    import { Deferred } from "@workadventure/shared-utils";
    import { asError } from "catch-unknown";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { AskStartVerificationModalProps } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        props: AskStartVerificationModalProps;
    }

    let { isOpen, props: modalProps }: Props = $props();
    let { request, otherDeviceInformation } = $derived(modalProps);
    let errorLabel: string | undefined = $state("");
    const doneDeferred = new Deferred<void>();
    let verifier: Verifier | undefined = $state();

    async function acceptToStartVerification() {
        try {
            await request.accept();

            // startVerification() can reject (e.g. "startVerification(): other device is unknown" when the
            // initiator's device keys are not cached yet). Keep it inside the try/catch so the failure is
            // surfaced instead of becoming a silent unhandled rejection that leaves both devices stuck.
            verifier = await request.startVerification(VerificationMethod.Sas);

            request.on(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);

            verifier.on(VerifierEvent.ShowSas, handleVerifierEventShowSas);
        } catch (error) {
            console.error("Failed to accept verification request:", error);
            errorLabel = asError(error).message || "Failed to accept verification request ...";
        }
    }

    const handleVerifierEventShowSas = (showSasCallbacks: ShowSasCallbacks) => {
        if (!verifier) return;

        const emojis = showSasCallbacks.sas.emoji;
        const confirmationCallback = async () => {
            await showSasCallbacks.confirm();
        };

        const mismatchCallback = () => {
            // Signal m.mismatched_sas to the other device (matrix-js-sdk 41). Previously this sent a
            // plain request.cancel({ reason }) which the other side saw as a generic user cancellation.
            // mismatch() is synchronous, so return a resolved promise to satisfy the Promise<void> type.
            showSasCallbacks.mismatch();
            return Promise.resolve();
        };

        if (!emojis) return;

        modals.close();

        matrixSecurity.openVerificationEmojiDialog({
            emojis,
            confirmationCallback,
            mismatchCallback,
            donePromise: doneDeferred.promise,
            isThisDeviceVerification: request.initiatedByMe,
        });

        verifier.verify().catch((error) => {
            console.error("error with verify ...", error);
            errorLabel = "Failed to start verification ...";
            doneDeferred.reject();
            verifier?.off(VerifierEvent.ShowSas, handleVerifierEventShowSas);
            request.off(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
        });
    };
    const handleChangeVerificationRequestEvent = () => {
        if (request.phase === VerificationPhase.Done) {
            doneDeferred.resolve();
            verifier?.off(VerifierEvent.ShowSas, handleVerifierEventShowSas);
            request.off(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
        }
        if (request.phase === VerificationPhase.Cancelled) {
            errorLabel = "request was cancelled ...";
            doneDeferred.reject();
            verifier?.off(VerifierEvent.ShowSas, handleVerifierEventShowSas);
            request.off(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
        }
    };

    async function refuseToStartVerification() {
        try {
            await request.cancel();
        } catch (error) {
            console.error(`Failed to cancel verification request : ${error}`);
        } finally {
            modals.close();
        }
    }

    // NB: no onDestroy cleanup of the request/verifier listeners here. handleVerifierEventShowSas closes
    // this modal (to open the emoji dialog) while the verification is still running, so the listeners must
    // OUTLIVE the component to observe the later Done/Cancelled transition — which is where they remove
    // themselves. Removing them on unmount would leave doneDeferred unresolved and the flow stuck.
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.askStartVerificationModal.title()}</h1>
    {/snippet}
    {#snippet content()}
        {#if otherDeviceInformation.name}
            {otherDeviceInformation.name}
        {/if}
        <br />
        {#if otherDeviceInformation.id}
            {otherDeviceInformation.id} {$LL.chat.askStartVerificationModal.from()}
        {/if}
        {#if otherDeviceInformation.ip}
            {otherDeviceInformation.ip}
        {/if}
    {/snippet}
    {#snippet action()}
        {#if !errorLabel}
            <Button class="flex-1 bg-danger-900" onclick={refuseToStartVerification}>
                {$LL.chat.askStartVerificationModal.ignore()}
            </Button>
            <Button
                variant="secondary"
                class="flex-1 bg-secondary"
                dataTestId="VerifyTheSessionButton"
                onclick={acceptToStartVerification}
            >
                {$LL.chat.askStartVerificationModal.accept()}
            </Button>
        {:else}
            <div>
                {errorLabel}
            </div>
        {/if}
    {/snippet}
</Popup>
