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
    import { IconAlertTriangle, IconDeviceDesktop } from "@wa-icons";
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
            console.error(asError(error).message);
            errorLabel = $LL.chat.askStartVerificationModal.startFailed();
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
            errorLabel = $LL.chat.askStartVerificationModal.startFailed();
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
            errorLabel = $LL.chat.askStartVerificationModal.cancelled();
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
        <h1 class="text-2xl font-bold">{$LL.chat.askStartVerificationModal.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-5">
            {#if errorLabel}
                <p class="m-0 flex gap-2 items-center text-base text-danger-400" role="alert">
                    <IconAlertTriangle class="shrink-0" font-size="20" />
                    {errorLabel}
                </p>
            {:else}
                <p class="m-0 text-base text-white/80">{$LL.chat.askStartVerificationModal.description()}</p>
            {/if}
            <div
                class="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-solid border-white/15"
                data-testid="verificationRequestDevice"
            >
                <span
                    class="w-11 h-11 shrink-0 rounded-[10px] bg-white/10 flex items-center justify-center"
                    aria-hidden="true"
                >
                    <IconDeviceDesktop font-size="22" />
                </span>
                <div class="flex flex-col gap-1.5 min-w-0">
                    <span class="text-lg font-bold truncate">
                        {otherDeviceInformation.name || $LL.chat.askStartVerificationModal.unknownDevice()}
                    </span>
                    {#if otherDeviceInformation.id || otherDeviceInformation.ip}
                        <span class="flex flex-wrap gap-2 text-sm text-white/75">
                            {#if otherDeviceInformation.id}
                                <span class="px-2 py-0.5 rounded-full bg-white/10">
                                    {$LL.chat.askStartVerificationModal.deviceId({ id: otherDeviceInformation.id })}
                                </span>
                            {/if}
                            {#if otherDeviceInformation.ip}
                                <span class="px-2 py-0.5 rounded-full bg-white/10">
                                    {$LL.chat.askStartVerificationModal.ipAddress({ ip: otherDeviceInformation.ip })}
                                </span>
                            {/if}
                        </span>
                    {/if}
                </div>
            </div>
            {#if !errorLabel}
                <p class="m-0 flex gap-2 items-center text-sm text-warning-400">
                    <IconAlertTriangle class="shrink-0" font-size="18" />
                    {$LL.chat.askStartVerificationModal.notYou()}
                </p>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full gap-3">
            {#if !errorLabel}
                <Button variant="light" appearance="ghost" class="flex-1" onclick={refuseToStartVerification}>
                    {$LL.chat.askStartVerificationModal.ignore()}
                </Button>
                <Button
                    variant="secondary"
                    class="flex-1"
                    dataTestId="VerifyTheSessionButton"
                    onclick={acceptToStartVerification}
                >
                    {$LL.chat.askStartVerificationModal.accept()}
                </Button>
            {:else}
                <span class="flex-1"></span>
                <Button variant="light" appearance="ghost" class="flex-1" onclick={() => modals.close()}>
                    {$LL.chat.askStartVerificationModal.close()}
                </Button>
            {/if}
        </div>
    {/snippet}
</Popup>
