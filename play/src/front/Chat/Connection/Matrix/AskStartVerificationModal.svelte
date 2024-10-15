<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { VerificationRequestEvent, VerifierEvent } from "matrix-js-sdk/lib/crypto-api";
    import { VerificationMethod } from "matrix-js-sdk/lib/types";
    import { Phase } from "matrix-js-sdk/lib/crypto/verification/request/VerificationRequest";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { AskStartVerificationModalProps, matrixSecurity } from "./MatrixSecurity";
    import { Device } from "matrix-js-sdk";

    export let isOpen: boolean;
    export let props: AskStartVerificationModalProps;
    const { request, otherDeviceInformation } = props;

    //TODO: changer le title en fonction de quelle device demande la vérification
    async function acceptToStartVerification() {
        try {
            await request.accept();
        } catch (error) {
            console.error(error);
            //TODO : Sentry
            //Todo : Gérer l'erreur : afficher un message et fermer la pop up
            return;
        }

        let donePromiseResolver: (() => void) | undefined;
        let donePromiseRejecter: ((reason?: any) => void) | undefined;

        const donePromise = new Promise<void>((resolve, reject) => {
            donePromiseResolver = resolve;
            donePromiseRejecter = reject;
        });

        const verifier = await request.startVerification(VerificationMethod.Sas);

        request.on(VerificationRequestEvent.Change, () => {
            if (request.phase === Phase.Done) {
                if (donePromiseResolver) donePromiseResolver();
            }
            if (request.phase === Phase.Cancelled) {
                if (donePromiseRejecter) donePromiseRejecter();
            }
        });
        verifier.on(VerifierEvent.ShowSas, () => {
            const showSasCallbacks = request.verifier?.getShowSasCallbacks();

            const emojis = showSasCallbacks?.sas.emoji;
            const confirmationCallback = showSasCallbacks?.confirm;
            const mismatchCallback = showSasCallbacks?.mismatch;

            console.log({ emojis, mismatchCallback, confirmationCallback });
            if (!emojis || !confirmationCallback || !mismatchCallback) return;

            closeModal();

            matrixSecurity.openVerificationEmojiDialog({
                emojis,
                confirmationCallback,
                mismatchCallback,
                donePromise,
                isThisDeviceVerification: request.initiatedByMe,
            });

            verifier.verify().catch(() => {
                console.error("error with verify ...");
                if (donePromiseRejecter) donePromiseRejecter();
            });
        });
    }

    async function refuseToStartVerification() {
        await request.cancel();
        closeModal();
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
        <button class="tw-flex-1 tw-justify-center tw-bg-danger-900 tw-mx-4" on:click={refuseToStartVerification}
            >{$LL.chat.askStartVerificationModal.ignore()}</button
        >
        <button class="tw-flex-1 tw-justify-center  tw-bg-secondary tw-mx-4" on:click={acceptToStartVerification}
            >{$LL.chat.askStartVerificationModal.accept()}</button
        >
    </svelte:fragment>
</Popup>
