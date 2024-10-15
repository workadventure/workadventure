import { Device, MatrixClient, SecretStorage } from "matrix-js-sdk";
import {
    EmojiMapping,
    GeneratedSecretStorageKey,
    KeyBackupInfo,
    VerificationRequest,
    VerificationRequestEvent,
    VerifierEvent,
} from "matrix-js-sdk/lib/crypto-api";
import { deriveKey } from "matrix-js-sdk/lib/crypto/key_passphrase";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto/recoverykey";
import { openModal } from "svelte-modals";
import { writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { VerificationMethod } from "matrix-js-sdk/lib/types";
import { Phase } from "matrix-js-sdk/lib/crypto/verification/request/VerificationRequest";
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

    async minimalInitTest() {
        //TODO : handle errors and see if we call this function in matrixChatConnection or in each matrixchatroom
        const crypto = this.matrixClientStore?.getCrypto();
        if (!crypto) return;
        const keyBackupInfo = await this.matrixClientStore?.getKeyBackupVersion();
        if (keyBackupInfo !== null && keyBackupInfo !== undefined) {
            await this.restoreBackupMessages(keyBackupInfo);
        }
    }
    updateMatrixClientStore(matrixClient: MatrixClient) {
        this.matrixClientStore = matrixClient;
    }

    static makeInputToKey(
        keyInfo: SecretStorage.SecretStorageKeyDescription
    ): (keyParams: KeyParams) => Promise<Uint8Array> {
        return async ({ passphrase, recoveryKey }): Promise<Uint8Array> => {
            if (passphrase) {
                return deriveKey(passphrase, keyInfo.passphrase.salt, keyInfo.passphrase.iterations);
            } else if (recoveryKey) {
                return decodeRecoveryKey(recoveryKey);
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

    //TODO: Rename this function
    public async verifyOwnDevice() {
        if (!this.matrixClientStore) return;

        const crypto = this.matrixClientStore.getCrypto();

        if (!crypto) return;

        try {
            const verificationRequest = await crypto.requestOwnUserVerification();

            let waitVerificationStartResolver: (
                verificationEmojiDialogProps: VerificationEmojiDialogProps
            ) => void | undefined;

            const startVerificationPromise = new Promise<VerificationEmojiDialogProps>((resolve, reject) => {
                waitVerificationStartResolver = resolve;
            });

            this._openModal(DeviceVerificationPendingModal, {
                startVerificationPromise,
                isInitiatedByMe: true,
            });

            let donePromiseResolver: () => void | undefined;
            //TODO : REJECTER ??
            let donePromiseRejecter: (reason?: any) => void;

            const donePromise = new Promise<void>((resolve, reject) => {
                donePromiseResolver = resolve;
                donePromiseRejecter = reject;
            });

            verificationRequest.on(VerificationRequestEvent.Change, () => {
                //TODO : timeout for the request ?

                if (verificationRequest.phase === Phase.Started) {
                    if (verificationRequest.chosenMethod === VerificationMethod.Sas) {
                        //TODO : ne pas oublier les off

                        //TODO : Can we use the same verifier ?

                        verificationRequest.verifier?.on(VerifierEvent.ShowSas, () => {
                            const showSasCallbacks = verificationRequest.verifier?.getShowSasCallbacks();
                            const emojis = showSasCallbacks?.sas.emoji;
                            const confirmationCallback = showSasCallbacks?.confirm;
                            const mismatchCallback = showSasCallbacks?.mismatch;

                            if (!emojis || !confirmationCallback || !mismatchCallback || this.isVerifyingDevice) return;

                            this.isVerifyingDevice = true;

                            console.log(verificationRequest.initiatedByMe);

                            if (waitVerificationStartResolver) {
                                waitVerificationStartResolver({
                                    emojis,
                                    confirmationCallback,
                                    mismatchCallback,
                                    donePromise,
                                    isThisDeviceVerification: verificationRequest.initiatedByMe,
                                });
                            }
                        });

                        verificationRequest.verifier?.verify().catch((error) => {
                            donePromiseRejecter(error);
                        });
                    }
                }

                if (verificationRequest.phase === Phase.Done) {
                    //display a message to confirm
                    //verificationRequest.off(VerificationRequestEvent.Change,...);
                    //verificationRequest.off(VerifierEvent.ShowSas,...);
                    donePromiseResolver();
                    this.isVerifyingDevice = false;
                    this.isEncryptionRequiredAndNotSet.set(false);
                }

                if (verificationRequest.phase === Phase.Cancelled) {
                    //close the modal and display a error message
                    //verificationRequest.off(VerificationRequestEvent.Change,...);
                    //verificationRequest.off(VerifierEvent.ShowSas,...);
                    donePromiseRejecter(new Error("verification request cancelled"));
                    this.isVerifyingDevice = false;
                }
            });
        } catch (error) {
            //TODO : revoir le msg
            console.error("Failed to ...", error);
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
        //TODO : voir si on est obligé de return quand on a pas une info ou passer a la suite
        //TODO : a la pace des return try catch quand on a pas une info importante et finally faire le init ...
        const client = this.matrixClientStore;

        if (!client) return;

        const crypto = client.getCrypto();

        if (!crypto) return;

        const userID = client.getUserId();

        if (!userID) return;

        const devices = await crypto.getUserDeviceInfo([userID]);

        const myDevices = devices.get(userID);

        const currentDeviceID = client.getDeviceId();

        if (!currentDeviceID) return;

        const verificationInformation = await crypto.getDeviceVerificationStatus(userID, currentDeviceID);

        if (!verificationInformation) return;

        const thisDeviceIsVerify = !!verificationInformation.signedByOwner;

        //TODO : Voir les dehydrated device
        /*
        try{
            const dehydratedDevice = await this.matrixClientStore.getDehydratedDevice();
        } catch (e) {
           console.error('pas de dehydrated Device ... ',e)
        }
    */

        const someDeviceAreVerified = Array.from(myDevices.values()).some(async (device) => {
            //TODO : ignore the dehydrated device
            //if (dehydratedDevice && device.deviceId === dehydratedDevice?.device_id) return false;

            //TODO :  ignore devices without an identity key
            if (!device.getIdentityKey()) return false;

            const verificationStatus = await crypto.getDeviceVerificationStatus(userID, device.deviceId);
            return !!verificationStatus?.signedByOwner;
        });

        if (someDeviceAreVerified && !thisDeviceIsVerify) {
            this.isEncryptionRequiredAndNotSet.set(true);
            this._openModal(ChooseDeviceVerificationMethodModal);
            return;
        }
        await this.initClientCryptoConfiguration();
    }
}

export const matrixSecurity = new MatrixSecurity();

export type VerificationEmojiDialogProps = {
    confirmationCallback: () => Promise<void>;
    mismatchCallback: () => void;
    emojis: EmojiMapping[];
    donePromise: Promise<void>;
    isThisDeviceVerification: boolean;
};

export type AskStartVerificationModalProps = {
    request: VerificationRequest;
    otherDeviceInformation: {
        id: string;
        ip: string | undefined;
        name: string | undefined;
    };
};
