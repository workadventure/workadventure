<script lang="ts">
    import { closeModal, onBeforeClose } from "svelte-modals";
    import { onDestroy } from "svelte";
    import type { ShowSasCallbacks, Verifier } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationRequestEvent, VerifierEvent } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationMethod } from "matrix-js-sdk/lib/types";
    import { Phase } from "matrix-js-sdk/lib/crypto/verification/request/VerificationRequest";
    import { Deferred } from "@workadventure/shared-utils";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { AskStartVerificationModalProps } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";

    export let isOpen: boolean;
    export let props: AskStartVerificationModalProps;
    const { request, otherDeviceInformation } = props;
    let errorLabel: string | undefined = "";
    const doneDeferred = new Deferred<void>();
    let verifier: Verifier | undefined;
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
        closeModal();

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
        if (request.phase === Phase.Done) {
            doneDeferred.resolve();
            cleanupVerificationListeners();
        }
        if (request.phase === Phase.Cancelled) {
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
            closeModal();
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
                class="btn btn-secondary flex-1 justify-center bg-secondary"
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
