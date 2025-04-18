<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { closeModal } from "svelte-modals";
    import { ShowSasCallbacks, VerificationRequestEvent, Verifier, VerifierEvent } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationMethod } from "matrix-js-sdk/lib/types";
    import { Phase } from "matrix-js-sdk/lib/crypto/verification/request/VerificationRequest";
    import { Deferred } from "ts-deferred";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { AskStartVerificationModalProps, matrixSecurity } from "./MatrixSecurity";

    export let isOpen: boolean;
    export let props: AskStartVerificationModalProps;
    const { request, otherDeviceInformation } = props;
    let errorLabel: string | undefined = "";
    const doneDeferred = new Deferred<void>();
    let verifier: Verifier | undefined;

    async function acceptToStartVerification() {
        try {
            await request.accept();
        } catch (error) {
            console.error(error);
            Sentry.captureMessage(`Failed to accept verification request : ${error}`);
            errorLabel = "Failed to accept verification request ...";
            return;
        }

        verifier = await request.startVerification(VerificationMethod.Sas);

        request.on(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);

        verifier.on(VerifierEvent.ShowSas, handleVerifierEventShowSas);
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

        closeModal();

        matrixSecurity.openVerificationEmojiDialog({
            emojis,
            confirmationCallback,
            mismatchCallback,
            donePromise: doneDeferred.promise,
            isThisDeviceVerification: request.initiatedByMe,
        });

        verifier.verify().catch((error) => {
            console.error("error with verify ...");
            errorLabel = "Failed to start verification ...";
            Sentry.captureMessage(`Failed to start verification ${error}`);
            doneDeferred.reject();
            verifier?.off(VerifierEvent.ShowSas, handleVerifierEventShowSas);
            request.off(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
        });
    };
    const handleChangeVerificationRequestEvent = () => {
        if (request.phase === Phase.Done) {
            doneDeferred.resolve();
            verifier?.off(VerifierEvent.ShowSas, handleVerifierEventShowSas);
            request.off(VerificationRequestEvent.Change, handleChangeVerificationRequestEvent);
        }
        if (request.phase === Phase.Cancelled) {
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
            closeModal();
        }
    }
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.askStartVerificationModal.title()}</h1>
    <div slot="content">
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
    </div>
    <svelte:fragment slot="action">
        {#if !errorLabel}
            <button class="btn flex-1 justify-center bg-danger-900" on:click={refuseToStartVerification}>
                {$LL.chat.askStartVerificationModal.ignore()}
            </button>
            <button
                class="btn btn-secondary flex-1 justify-center  bg-secondary"
                data-testid="VerifyTheSessionButton"
                on:click={acceptToStartVerification}
            >
                {$LL.chat.askStartVerificationModal.accept()}
            </button>
        {:else}
            <div>
                {errorLabel}
            </div>
        {/if}
    </svelte:fragment>
</Popup>
