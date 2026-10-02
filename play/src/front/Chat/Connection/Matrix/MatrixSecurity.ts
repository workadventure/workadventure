import type { MatrixClient, SecretStorage } from "matrix-js-sdk";
import type {
    EmojiMapping,
    GeneratedSecretStorageKey,
    KeyBackupInfo,
    ShowSasCallbacks,
    VerificationRequest,
} from "matrix-js-sdk/lib/crypto-api";
import {
    VerificationRequestEvent,
    VerifierEvent,
    VerificationPhase,
    deriveRecoveryKeyFromPassphrase,
    decodeRecoveryKey,
} from "matrix-js-sdk/lib/crypto-api";
import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import { VerificationMethod } from "matrix-js-sdk/lib/types";
import { asError } from "catch-unknown";
import { alreadyAskForInitCryptoConfiguration } from "../../Stores/AlreadyAskForInitCryptoConfigurationStore";
import InteractiveAuthDialog from "./InteractiveAuthDialog.svelte";
import CreateRecoveryKeyDialog from "./CreateRecoveryKeyDialog.svelte";
import VerificationEmojiDialog from "./VerificationEmojiDialog.svelte";
import DeviceVerificationModal from "./DeviceVerificationModal.svelte";
import AskStartVerificationModal from "./AskStartVerificationModal.svelte";
import ChooseDeviceVerificationMethodModal from "./ChooseDeviceVerificationMethodModal.svelte";
import { modals } from "@wa-modals";

export type KeyParams = { passphrase?: string; recoveryKey?: string };

export class MatrixSecurity {
    isEncryptionRequiredAndNotSet = writable(false);
    private matrixClientStore: MatrixClient | null = null;
    private isVerifyingDevice = false;
    private automaticDeviceVerificationPromptRequested = false;
    // The in-flight own-device SAS verification request, so DeviceVerificationModal can cancel it on close.
    private ownDeviceSasRequest: VerificationRequest | null = null;
    public shouldDisplayModal = false;
    constructor(
        private initializingEncryptionPromise: Promise<void> | undefined = undefined,
        private restoreRoomMessagesPromise: Promise<void> | undefined = undefined,
        private _openModal = modals.open,
    ) {}

    initClientCryptoConfiguration = async (): Promise<void> => {
        const client = this.matrixClientStore;
        if (!client) {
            return Promise.reject(new Error("matrixClientStore is null"));
        }

        if (client.isGuest()) {
            return Promise.reject(new Error("Guest user, no encryption key"));
        }

        const crypto = client.getCrypto();

        if (crypto === undefined) {
            return Promise.reject(new Error("E2EE is not available for this client"));
        }
        if (this.initializingEncryptionPromise) {
            console.info("Encryption already initialized");
            return;
        }

        alreadyAskForInitCryptoConfiguration.set(true);
        this.shouldDisplayModal = true;
        this.initializingEncryptionPromise = new Promise<void>((resolve, initializingEncryptionReject) => {
            (async () => {
                const keyBackupInfo = await crypto.getKeyBackupInfo();
                const isCrossSigningReady = await crypto.isCrossSigningReady();

                if (!isCrossSigningReady || keyBackupInfo === null) {
                    await crypto.bootstrapCrossSigning({
                        authUploadDeviceSigningKeys: async (makeRequest) => {
                            const finished = await new Promise<boolean>((resolve) => {
                                this._openModal(InteractiveAuthDialog, {
                                    matrixClient: client,
                                    onFinished: (finished: boolean) => resolve(finished),
                                    makeRequest,
                                });
                            });
                            if (!finished) {
                                this.isEncryptionRequiredAndNotSet.set(true);
                                throw new Error("Cross-signing key upload auth canceled");
                            }
                        },
                        setupNewCrossSigning: keyBackupInfo === null,
                    });

                    await crypto.bootstrapSecretStorage({
                        createSecretStorageKey: async () => {
                            const generatedKey = await new Promise<GeneratedSecretStorageKey | null>(
                                (resolve, reject) => {
                                    this._openModal(CreateRecoveryKeyDialog, {
                                        crypto,
                                        processCallback: (generatedKey: GeneratedSecretStorageKey | undefined) => {
                                            if (generatedKey === undefined) {
                                                return reject(new Error("no generated key storage"));
                                            }
                                            resolve(generatedKey);
                                        },
                                    });
                                },
                            );

                            if (generatedKey === null) {
                                this.isEncryptionRequiredAndNotSet.set(true);
                                const createSecretStorageKeyError = new Error(
                                    "createSecretStorageKey : no generated key storage",
                                );
                                initializingEncryptionReject(createSecretStorageKeyError);
                                return Promise.reject(createSecretStorageKeyError);
                            }
                            return Promise.resolve(generatedKey);
                        },
                        setupNewKeyBackup: keyBackupInfo === null,
                    });

                    this.isEncryptionRequiredAndNotSet.set(false);
                }

                if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
                    await this.restoreBackupMessages(keyBackupInfo);
                }

                return resolve();
            })
                .bind(this)()
                .catch((error) => {
                    console.error("initClientCryptoConfiguration error: ", error);
                    this.initializingEncryptionPromise = undefined;
                    initializingEncryptionReject(asError(error));
                    return;
                });
        });
        return;
    };

    async restoreRoomsMessages() {
        if (this.restoreRoomMessagesPromise) return this.restoreRoomMessagesPromise;

        this.restoreRoomMessagesPromise = new Promise((resolve, reject) => {
            const client = this.matrixClientStore;
            if (!client) {
                reject(new Error("matrix client is undefined"));
                return;
            }

            const crypto = client.getCrypto();

            if (!crypto) {
                reject(new Error("crypto api is not available"));
                return;
            }

            crypto
                .getKeyBackupInfo()
                .then((keyBackupInfo) => {
                    if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
                        this.restoreBackupMessages(keyBackupInfo).catch((error) => {
                            throw new Error(error);
                        });
                    }
                    resolve();
                })
                .catch((error) => {
                    throw new Error(error);
                });
        });

        return this.restoreRoomMessagesPromise;
    }
    updateMatrixClientStore(matrixClient: MatrixClient) {
        this.matrixClientStore = matrixClient;
    }

    static makeInputToKey(
        keyInfo: SecretStorage.SecretStorageKeyDescription,
    ): (keyParams: KeyParams) => Promise<Uint8Array<ArrayBuffer>> {
        return ({ passphrase, recoveryKey }): Promise<Uint8Array<ArrayBuffer>> => {
            if (passphrase) {
                return deriveRecoveryKeyFromPassphrase(
                    passphrase,
                    keyInfo.passphrase.salt,
                    keyInfo.passphrase.iterations,
                );
            } else if (recoveryKey) {
                return Promise.resolve(decodeRecoveryKey(recoveryKey));
            }
            throw new Error("Invalid input, recovery passphrase or recovery key need to be provided");
        };
    }

    private async restoreBackupMessages(keyBackupInfo: KeyBackupInfo) {
        try {
            if (!this.matrixClientStore) {
                return Promise.reject(new Error("matrixClientStore is null"));
            }
            const has4s = await this.matrixClientStore.secretStorage.hasKey();
            const backupRestored = has4s ? await this.matrixClientStore.isKeyBackupKeyStored() : null;

            const restoredWithCachedKey = await this.restoreWithCachedKey(keyBackupInfo);
            if (!restoredWithCachedKey && backupRestored) {
                await this.restoreWithSecretStorage(keyBackupInfo);
            }
        } catch (error) {
            console.error("Unable to restoreBackupMessages : ", error);
        }
        return;
    }

    private async restoreWithCachedKey(keyBackupInfo: KeyBackupInfo) {
        try {
            const crypto = this.matrixClientStore?.getCrypto();
            if (!crypto) {
                return Promise.reject(new Error("crypto api is not available"));
            }
            // The decryption key must already be cached in the crypto store (e.g. set when the
            // backup was created). restoreKeyBackup() downloads and imports the backup using it.
            await crypto.restoreKeyBackup();
            return true;
        } catch (error) {
            console.error("Unable to restoreKeyBackupWithCache : ", error);
            return false;
        }
    }

    private async restoreWithSecretStorage(keyBackupInfo: KeyBackupInfo) {
        try {
            const crypto = this.matrixClientStore?.getCrypto();
            if (!crypto) {
                return Promise.reject(new Error("crypto api is not available"));
            }
            // Load the backup decryption key from 4S into the crypto store, then restore.
            await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
            await crypto.restoreKeyBackup();
            return true;
        } catch (error) {
            console.error("Unable to restoreWithSecretStorage : ", error);
            return false;
        }
    }

    public async setupNewKeyStorage() {
        const crypto = this.matrixClientStore?.getCrypto();
        if (!crypto) return;
        try {
            await crypto.bootstrapSecretStorage({
                createSecretStorageKey: async () => {
                    const generatedKey = await new Promise<GeneratedSecretStorageKey | null>((resolve, reject) => {
                        this._openModal(CreateRecoveryKeyDialog, {
                            crypto,
                            processCallback: (generatedKey: GeneratedSecretStorageKey | undefined) => {
                                if (generatedKey === undefined) {
                                    return reject(new Error("no generated secret storage key"));
                                }
                                resolve(generatedKey);
                            },
                        });
                    });

                    if (generatedKey === null) {
                        this.isEncryptionRequiredAndNotSet.set(true);
                        const createSecretStorageKeyError = new Error(
                            "createSecretStorageKey : no generated secret storage key",
                        );
                        return Promise.reject(createSecretStorageKeyError);
                    }
                    return Promise.resolve(generatedKey);
                },
                setupNewKeyBackup: true,
                setupNewSecretStorage: true,
            });

            const keyBackupInfo = await crypto.getKeyBackupInfo();

            if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
                await this.restoreBackupMessages(keyBackupInfo);
            }

            alreadyAskForInitCryptoConfiguration.set(false);
        } catch (error) {
            console.error("Failed to reset KeybackUp", error);
        }
    }

    public async verifyOwnDevice() {
        try {
            if (!this.matrixClientStore) throw new Error("MatrixClientStore is null");

            const crypto = this.matrixClientStore.getCrypto();

            if (!crypto) throw new Error("Crypto API is undefined");

            const verificationRequest = await crypto.requestOwnUserVerification();

            // Single reactive modal driven by a store, mirroring Element's VerificationPanel: one component
            // renders "waiting" -> "emoji" -> "done"/"error" straight from the request/verifier state, instead of
            // handing off between a pending modal and an emoji dialog through a Deferred. That handoff — plus
            // reading the shared this.isVerifyingDevice flag to gate the emoji display — was the intermittent-hang
            // source; both are gone here.
            this.ownDeviceSasRequest = verificationRequest;
            // Re-entrancy guard for the modal openers ONLY. It is NEVER read to decide whether to show the emojis
            // (the closure-local sasShown latch does that), and it is cleared on every terminal transition and on
            // modal close, so it can no longer stick true and block later verification prompts.
            this.isVerifyingDevice = true;

            const isThisDeviceVerification = verificationRequest.initiatedByMe;
            const state: Writable<DeviceVerificationState> = writable({
                status: "waiting",
                isThisDeviceVerification,
            });

            this._openModal(DeviceVerificationModal, { verificationState: state });

            let sasListenerAttached = false;
            let sasStartRequested = false;
            let startRetries = 0;
            let sasShown = false;

            const showSasHandler = (showSasCallbacks: ShowSasCallbacks) => {
                const emojis = showSasCallbacks.sas.emoji;
                if (!emojis || sasShown) return;
                sasShown = true;
                state.set({
                    status: "emoji",
                    isThisDeviceVerification,
                    emojis,
                    confirmationCallback: async () => {
                        await showSasCallbacks.confirm();
                    },
                    mismatchCallback: () => {
                        // Signal m.mismatched_sas to the other device (matrix-js-sdk 41). mismatch() is
                        // synchronous, so return a resolved promise to satisfy the Promise<void> callback type.
                        showSasCallbacks.mismatch();
                        return Promise.resolve();
                    },
                });
            };

            const cleanup = () => {
                this.isVerifyingDevice = false;
                if (this.ownDeviceSasRequest === verificationRequest) {
                    this.ownDeviceSasRequest = null;
                }
                verificationRequest.off(VerificationRequestEvent.Change, onVerificationChange);
                verificationRequest.verifier?.off(VerifierEvent.ShowSas, showSasHandler);
            };

            // Named handler so it can be removed on terminal phases (the old inline arrow leaked on the
            // request/verifier for the client's lifetime and could be re-attached on every Change).
            const onVerificationChange = () => {
                // As the initiating device we must send the `m.key.verification.start` ourselves once the other
                // device is ready. `requestOwnUserVerification()` only sends the request; nothing here moves the
                // flow to the Started phase on its own. Element never auto-starts either: at the Ready phase it
                // renders a "Verify by emoji" button and only calls request.startVerification(Sas) when the user
                // clicks it. Our pending UI is just a spinner with no such button, so when WA is the initiator
                // against Element nobody ever sends the start and the request stalls at Ready forever (both
                // devices sit "waiting for the other device").
                //
                // Before starting we force-download our own devices: on a fresh session the other device's keys
                // are not cached yet, and startVerification() then rejects with "other device is unknown"
                // (matrix-org/matrix-rust-sdk#2896). Combined with the sasStartRequested guard that would leave
                // the request stuck at Ready. getUserDeviceInfo(..., downloadUncached = true) makes the other
                // device known so the start succeeds. If the peer starts at the same time (glare), the SDK
                // resolves the tie-break and a redundant start fails harmlessly while the Started branch runs.
                if (
                    verificationRequest.phase === VerificationPhase.Ready &&
                    !sasStartRequested &&
                    !sasListenerAttached
                ) {
                    sasStartRequested = true;
                    const startSasVerification = async () => {
                        const ownUserId = this.matrixClientStore?.getUserId();
                        if (ownUserId) {
                            await crypto.getUserDeviceInfo([ownUserId], true);
                        }
                        if (!verificationRequest.otherPartySupportsMethod(VerificationMethod.Sas)) {
                            throw new Error("the other device does not support SAS verification");
                        }
                        await verificationRequest.startVerification(VerificationMethod.Sas);
                    };
                    startSasVerification().catch((error) => {
                        console.error("Failed to start SAS verification from the initiating device", error);
                        // sasStartRequested is set before the awaits, so a transient reject (e.g. the other
                        // device's keys still propagating just after getUserDeviceInfo) would otherwise latch
                        // the request at Ready forever. Allow a small, bounded number of retries on the next
                        // Change instead of giving up permanently.
                        if (startRetries++ < 2) {
                            sasStartRequested = false;
                        }
                    });
                }

                if (verificationRequest.phase === VerificationPhase.Started && !sasListenerAttached) {
                    const verifier = verificationRequest.verifier;
                    if (!verifier) {
                        console.error("Verification reached Started phase without a verifier");
                        return;
                    }
                    if (verificationRequest.chosenMethod !== VerificationMethod.Sas) {
                        console.error("The chosen verification method is not implemented");
                        return;
                    }

                    sasListenerAttached = true;

                    // The SAS may already have been computed before this handler first runs; pick it up
                    // directly instead of waiting for a ShowSas event that already fired (would hang forever).
                    const alreadyShownSas = verifier.getShowSasCallbacks();
                    if (alreadyShownSas) {
                        showSasHandler(alreadyShownSas);
                    } else {
                        verifier.on(VerifierEvent.ShowSas, showSasHandler);
                    }

                    verifier.verify().catch((error) => {
                        console.error("SAS verify() failed", error);
                        state.set({ status: "error", isThisDeviceVerification });
                    });
                }

                if (verificationRequest.phase === VerificationPhase.Done) {
                    state.set({ status: "done", isThisDeviceVerification });
                    this.isEncryptionRequiredAndNotSet.set(false);
                    cleanup();
                }

                if (verificationRequest.phase === VerificationPhase.Cancelled) {
                    // A cancel AFTER the emojis were shown is a verification failure the user must see (e.g. the
                    // peer clicked "they don't match" -> m.mismatched_sas), so surface it as an error. A cancel
                    // BEFORE the emojis (peer declined / timed out) is a plain cancellation.
                    state.update((current) =>
                        current.status === "done"
                            ? current
                            : { status: sasShown ? "error" : "cancelled", isThisDeviceVerification },
                    );
                    cleanup();
                }
            };

            verificationRequest.on(VerificationRequestEvent.Change, onVerificationChange);

            // The request may already have moved on (e.g. the other device accepted before we subscribed);
            // the Change listener only fires on *subsequent* transitions, so evaluate the current phase once.
            onVerificationChange();
        } catch (error) {
            this.isVerifyingDevice = false;
            this.ownDeviceSasRequest = null;
            console.error("Failed to verify this device", error);
        }
    }

    /**
     * Cancel the in-flight own-device SAS verification (e.g. the user closed the modal), driving the request to
     * Cancelled so the re-entrancy flag is released and the peer stops waiting. No-op once terminal.
     */
    public async cancelOwnDeviceSasVerification() {
        const request = this.ownDeviceSasRequest;
        if (!request) return;
        try {
            if (request.phase !== VerificationPhase.Done && request.phase !== VerificationPhase.Cancelled) {
                await request.cancel();
            }
        } catch (error) {
            console.error("Failed to cancel own device SAS verification", error);
        } finally {
            this.isVerifyingDevice = false;
            this.ownDeviceSasRequest = null;
        }
    }

    public openVerificationEmojiDialog(verificationEmojiDialogProps: VerificationEmojiDialogProps) {
        this._openModal(VerificationEmojiDialog, {
            props: verificationEmojiDialogProps,
        });
    }

    public openAskStartVerification(askStartVerificationModalProps: AskStartVerificationModalProps) {
        this._openModal(AskStartVerificationModal, {
            props: askStartVerificationModalProps,
        });
    }

    public openAutomaticChooseDeviceVerificationMethodModal(): Promise<void> {
        if (this.automaticDeviceVerificationPromptRequested || this.isVerifyingDevice) {
            return Promise.resolve();
        }

        this.automaticDeviceVerificationPromptRequested = true;
        return this.openChooseDeviceVerificationMethodModal();
    }

    public async openChooseDeviceVerificationMethodModal() {
        if (this.isVerifyingDevice) {
            return;
        }

        try {
            this.isVerifyingDevice = true;

            const client = this.matrixClientStore;

            if (!client) return;

            const crypto = client.getCrypto();
            const userID = client.getUserId();

            if (!crypto || !userID) throw new Error("Crypto API or User ID is not defined ...");

            const devices = await crypto.getUserDeviceInfo([userID]);

            const myDevices = devices.get(userID);

            const currentDeviceID = client.getDeviceId();

            if (!currentDeviceID) throw new Error("Failed to find current device ID");

            const verificationInformation = await crypto.getDeviceVerificationStatus(userID, currentDeviceID);

            if (!verificationInformation) return;

            const currentDeviceIsVerify = verificationInformation.signedByOwner;

            const devicesArray = Array.from(myDevices?.values() || []);
            const someDeviceAreVerified = await devicesArray.reduce(async (acc, device) => {
                const previousResult = await acc;
                if (previousResult) return true;

                if (!device.getIdentityKey()) return false;
                if (device.deviceId === currentDeviceID) return false;
                // A dehydrated device is not a real interactive device to verify against (matches Element's
                // hasOtherVerifiedDevices); counting it would steer the user to "verify with another device".
                if (device.dehydrated) return false;

                const verificationStatus = await crypto.getDeviceVerificationStatus(userID, device.deviceId);
                return !!verificationStatus?.signedByOwner;
            }, Promise.resolve(false));

            if (someDeviceAreVerified && !currentDeviceIsVerify) {
                this.isEncryptionRequiredAndNotSet.set(true);
                this._openModal(ChooseDeviceVerificationMethodModal);
                return;
            }
            await this.initClientCryptoConfiguration();
        } catch (error) {
            console.error("Failed to open modal to choose Verification modal method:", error);
        } finally {
            this.isVerifyingDevice = false;
        }
    }
}

export const matrixSecurity = new MatrixSecurity();

export type VerificationEmojiDialogProps = {
    confirmationCallback: () => Promise<void>;
    mismatchCallback: () => Promise<void>;
    emojis: EmojiMapping[];
    donePromise: Promise<void>;
    isThisDeviceVerification: boolean;
};

// State of an own-device SAS verification, driven by verifyOwnDevice() and rendered by DeviceVerificationModal
// (mirrors QrVerificationState). The whole flow lives in one modal that re-renders off this store.
//   waiting   - request sent / waiting for the peer / waiting for the SAS to compute (spinner)
//   emoji     - SAS emojis available; the user compares and clicks match / don't match
//   done      - verification completed (check + "understood")
//   cancelled - request cancelled before any emojis were shown (peer declined / timed out)
//   error     - verification failed (verify() rejected, or the peer signalled a mismatch after the emojis)
export type DeviceVerificationState = {
    status: "waiting" | "emoji" | "done" | "cancelled" | "error";
    isThisDeviceVerification: boolean;
    emojis?: EmojiMapping[];
    confirmationCallback?: () => Promise<void>;
    mismatchCallback?: () => Promise<void>;
};

export type AskStartVerificationModalProps = {
    request: VerificationRequest;
    otherDeviceInformation: {
        id: string | undefined;
        ip: string | undefined;
        name: string | undefined;
    };
};
