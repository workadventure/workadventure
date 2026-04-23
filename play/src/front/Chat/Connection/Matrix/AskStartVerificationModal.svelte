<script lang="ts">
    import type { ShowSasCallbacks, Verifier } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationRequestEvent, VerifierEvent, VerificationPhase } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationMethod } from "matrix-js-sdk/lib/types";
    import { Deferred } from "@workadventure/shared-utils";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { AskStartVerificationModalProps } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        props: AskStartVerificationModalProps;
    }

    let { isOpen, props: modalProps }: Props = $props();
    let { request, otherDeviceInformation } = $derived(modalProps);
    let errorLabel: string | undefined = $state("");
    const doneDeferred = new Deferred<void>();
    let verifier: Verifier | undefined = $state();
    let listenersAttached = false;
    let verificationHandedOffToEmojiDialog = false;

    const cleanupVerificationListeners = () => {
        if (!listenersAttached) {
            return;
        }

        listenersAttached = false;
        verifier?.off(VerifierEvent.ShowSas, handleVerifierEventShowSas);
        request.off(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
        verifier = undefined;
    };

    async function acceptToStartVerification() {
        try {
            await request.accept();
        } catch (error) {
            console.error("Failed to accept verification request:", error);
            errorLabel = "Failed to accept verification request ...";
            return;
        }

        try {
            verifier = await request.startVerification(VerificationMethod.Sas);
            cleanupVerificationListeners();
            request.on(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
            verifier.on(VerifierEvent.ShowSas, handleVerifierEventShowSas);
            listenersAttached = true;
        } catch (error) {
            console.error("Failed to start verification request:", error);
            errorLabel = "Failed to start verification request ...";
        }
    }

    const handleVerifierEventShowSas = (showSasCallbacks: ShowSasCallbacks) => {
        if (!verifier) return;

        const emojis = showSasCallbacks.sas.emoji;
        const confirmationCallback = async () => {
            await showSasCallbacks.confirm();
        };

        const mismatchCallback = () => {
            //TODO : use showSasCallbacks.mismatch(); after matris-js-sdk update
            //showSasCallbacks.mismatch();
            return request.cancel({ reason: "m.mismatched_sas" });
        };

        if (!emojis) return;

        verificationHandedOffToEmojiDialog = true;
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
            cleanupVerificationListeners();
        });
    };
    const handleChangeVerificationRequestEvent = () => {
        if (request.phase === VerificationPhase.Done) {
            doneDeferred.resolve();
            cleanupVerificationListeners();
        }
        if (request.phase === VerificationPhase.Cancelled) {
            errorLabel = "request was cancelled ...";
            doneDeferred.reject();
            cleanupVerificationListeners();
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

    onBeforeClose(() => {
        if (!verificationHandedOffToEmojiDialog) {
            cleanupVerificationListeners();
        }
    });

    onDestroy(() => {
        if (!verificationHandedOffToEmojiDialog) {
            cleanupVerificationListeners();
        }
    });
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
            <button class="btn flex-1 justify-center bg-danger-900" onclick={refuseToStartVerification}>
                {$LL.chat.askStartVerificationModal.ignore()}
            </button>
            <button
                class="btn btn-secondary flex-1 justify-center bg-secondary"
                data-testid="VerifyTheSessionButton"
                onclick={acceptToStartVerification}
            >
                {$LL.chat.askStartVerificationModal.accept()}
            </button>
        {:else}
            <div>
                {errorLabel}
            </div>
        {/if}
    {/snippet}
</Popup>
