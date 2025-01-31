import { MatrixClient, SecretStorage } from "matrix-js-sdk";
import {
    EmojiMapping,
    GeneratedSecretStorageKey,
    KeyBackupInfo,
    VerificationRequest,
    VerificationRequestEvent,
    VerifierEvent,
    decodeRecoveryKey
} from "matrix-js-sdk/lib/crypto-api";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { openModal } from "svelte-modals";
import { writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { VerificationMethod } from "matrix-js-sdk/lib/types";
import { Phase } from "matrix-js-sdk/lib/crypto/verification/request/VerificationRequest";
import { Deferred } from "ts-deferred";
import { alreadyAskForInitCryptoConfiguration } from "../../Stores/ChatStore";
import InteractiveAuthDialog from "./InteractiveAuthDialog.svelte";
import CreateRecoveryKeyDialog from "./CreateRecoveryKeyDialog.svelte";
import VerificationEmojiDialog from "./VerificationEmojiDialog.svelte";
import DeviceVerificationPendingModal from "./DeviceVerificationPendingModal.svelte";
import AskStartVerificationModal from "./AskStartVerificationModal.svelte";
import ChooseDeviceVerificationMethodModal from "./ChooseDeviceVerificationMethodModal.svelte";

export type KeyParams = { passphrase?: string; recoveryKey?: string };

export class MatrixSecurity {
    isEncryptionRequiredAndNotSet = writable(false);
    private matrixClientStore: MatrixClient | null = null;
    private isVerifyingDevice = false;
    public shouldDisplayModal = false;
    constructor(
        private initializingEncryptionPromise: Promise<void> | undefined = undefined,
        private restoreRoomMessagesPromise: Promise<void> | undefined = undefined,
        private _openModal = openModal
    ) {}

    initClientCryptoConfiguration = async (): Promise<void> => {
        if (!this.matrixClientStore) {
            return Promise.reject(new Error("matrixClientStore is null"));
        }

        if (this.matrixClientStore.isGuest()) {
            return Promise.reject(new Error("Guest user, no encryption key"));
        }

        const crypto = this.matrixClientStore.getCrypto();

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
                const keyBackupInfo = await this.matrixClientStore?.getKeyBackupVersion();
                const isCrossSigningReady = await crypto.isCrossSigningReady();

                if (!isCrossSigningReady || keyBackupInfo === null) {
                    await crypto.bootstrapCrossSigning({
                        authUploadDeviceSigningKeys: async (makeRequest) => {
                            const finished = await new Promise<boolean>((resolve) => {
                                this._openModal(InteractiveAuthDialog, {
                                    matrixClient: this.matrixClientStore,
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
                                        processCallback: (generatedKey: GeneratedSecretStorageKey | null) => {
                                            if (generatedKey === undefined) {
                                                return reject(new Error("no generated key storage"));
                                            }
                                            resolve(generatedKey);
                                        },
                                    });
                                }
                            );

                            if (generatedKey === null) {
                                this.isEncryptionRequiredAndNotSet.set(true);
                                const createSecretStorageKeyError = new Error(
                                    "createSecretStorageKey : no generated key storage"
                                );
                                initializingEncryptionReject(createSecretStorageKeyError);
                                return Promise.reject(createSecretStorageKeyError);
                            }
                            return Promise.resolve(generatedKey);
                        },
                        setupNewKeyBackup: keyBackupInfo === null,
                        keyBackupInfo: keyBackupInfo ?? undefined,
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
                    Sentry.captureMessage(`initClientCryptoConfiguration error : ${error}`);
                    this.initializingEncryptionPromise = undefined;
                    initializingEncryptionReject(error);
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

            client
                .getKeyBackupVersion()
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
        keyInfo: SecretStorage.SecretStorageKeyDescription
    ): (keyParams: KeyParams) => Promise<Uint8Array> {
        return ({ passphrase, recoveryKey }): Promise<Uint8Array> => {
            if (passphrase) {
                return deriveKey(passphrase, keyInfo.passphrase.salt, keyInfo.passphrase.iterations);
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
            if (!this.matrixClientStore) {
                return Promise.reject(new Error("matrixClientStore is null"));
            }
            await this.matrixClientStore.restoreKeyBackupWithCache(undefined, undefined, keyBackupInfo);
            return true;
        } catch (error) {
            console.error("Unable to restoreKeyBackupWithCache : ", error);
            return false;
        }
    }

    private async restoreWithSecretStorage(keyBackupInfo: KeyBackupInfo) {
        try {
            if (!this.matrixClientStore) {
                return Promise.reject(new Error("matrixClientStore is null"));
            }
            await this.matrixClientStore.restoreKeyBackupWithSecretStorage(keyBackupInfo);
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
                            processCallback: (generatedKey: GeneratedSecretStorageKey | null) => {
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
                            "createSecretStorageKey : no generated secret storage key"
                        );
                        return Promise.reject(createSecretStorageKeyError);
                    }
                    return Promise.resolve(generatedKey);
                },
                setupNewKeyBackup: true,
                setupNewSecretStorage: true,
            });

            const keyBackupInfo = await this.matrixClientStore?.getKeyBackupVersion();

            if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
                await this.restoreBackupMessages(keyBackupInfo);
            }

            alreadyAskForInitCryptoConfiguration.set(false);
        } catch (error) {
            console.error("Failed to reset KeybackUp");
            Sentry.captureMessage(`Failed to reset key storage : ${error}`);
        }
    }

    public async verifyOwnDevice() {
        try {
            if (!this.matrixClientStore) throw new Error("MatrixClientStore is null");

            const crypto = this.matrixClientStore.getCrypto();

            if (!crypto) throw new Error("Crypto API is undefined");

            const verificationRequest = await crypto.requestOwnUserVerification();

            const startVerificationDeferred = new Deferred<VerificationEmojiDialogProps>();

            this._openModal(DeviceVerificationPendingModal, {
                startVerificationPromise: startVerificationDeferred.promise,
                isInitiatedByMe: true,
            });

            const doneVerificationDeferred = new Deferred<void>();

            verificationRequest.on(VerificationRequestEvent.Change, () => {
                if (verificationRequest.phase === Phase.Started) {
                    const verifier = verificationRequest.verifier;

                    if (!verifier) throw new Error("Verifier is undefined");

                    switch (verificationRequest.chosenMethod) {
                        case VerificationMethod.Sas:
                            verifier.on(VerifierEvent.ShowSas, (showSasCallbacks) => {
                                const emojis = showSasCallbacks.sas.emoji;
                                const confirmationCallback = async () => {
                                    await showSasCallbacks.confirm();
                                };
                                const mismatchCallback = () => {
                                    //TODO : use showSasCallbacks.mismatch(); after matris-js-sdk update
                                    //showSasCallbacks.mismatch();
                                    return verificationRequest.cancel({ reason: "m.mismatched_sas" });
                                };

                                if (!emojis || this.isVerifyingDevice) return;

                                this.isVerifyingDevice = true;

                                startVerificationDeferred.resolve({
                                    emojis,
                                    confirmationCallback,
                                    mismatchCallback,
                                    donePromise: doneVerificationDeferred.promise,
                                    isThisDeviceVerification: verificationRequest.initiatedByMe,
                                });
                            });

                            verifier.verify().catch((error) => {
                                doneVerificationDeferred.reject(error);
                            });
                            break;
                        default:
                            throw new Error("The chosen verification method is not implemented");
                    }
                }

                if (verificationRequest.phase === Phase.Done) {
                    doneVerificationDeferred.resolve();
                    this.isVerifyingDevice = false;
                    this.isEncryptionRequiredAndNotSet.set(false);
                }

                if (verificationRequest.phase === Phase.Cancelled) {
                    doneVerificationDeferred.reject(new Error("verification request cancelled"));
                    this.isVerifyingDevice = false;
                }
            });
        } catch (error) {
            Sentry.captureMessage(`Failed to verify this device :  ${error}`);
            console.error("Failed to verify this device", error);
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

    public async openChooseDeviceVerificationMethodModal() {
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

            const someDeviceAreVerified = !myDevices
                ? false
                : Array.from(myDevices.values()).some(async (device) => {
                      if (!device.getIdentityKey()) return false;

                      const verificationStatus = await crypto.getDeviceVerificationStatus(userID, device.deviceId);
                      return !!verificationStatus?.signedByOwner;
                  });

            if (someDeviceAreVerified && !currentDeviceIsVerify) {
                this.isEncryptionRequiredAndNotSet.set(true);
                this._openModal(ChooseDeviceVerificationMethodModal);
                return;
            }
            await this.initClientCryptoConfiguration();
        } catch (error) {
            console.error(error);
            Sentry.captureMessage(`Failed to open modal to choose Verification modal method : ${error}`);
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

export type AskStartVerificationModalProps = {
    request: VerificationRequest;
    otherDeviceInformation: {
        id: string | undefined;
        ip: string | undefined;
        name: string | undefined;
    };
};
